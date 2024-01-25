package ffmpeg

import (
	"bufio"
	"encoding/json"
	"os"
	"strconv"
	"strings"
	"sync"

	ffmpeg "github.com/u2takey/ffmpeg-go"
)

type Converter struct {
    onProgressUpdate func(uint8)

    wg sync.WaitGroup
    filepath string
    err error
}

func (c *Converter) OnProgressUpdate(onProgressUpdate func(uint8)) {
    c.onProgressUpdate = onProgressUpdate
}

func (c *Converter) Wait() {
    c.wg.Wait()
}

// returns the first error that occured or nil
func (c *Converter) Err() error {
    return c.err
}

// Asynchronously converts the file
func (c *Converter) ConvertToMP3(inFileName, outFileName string) {
    c.wg.Add(1)
    go func() {
        defer c.wg.Done()

        probeResultJson, err := ffmpeg.Probe(inFileName)
        if err != nil {
            c.err = err
            return
        }

        type ProbeResult struct {
            Format struct {
                Duration string `json:"duration"`
            } `json:"format"`
        }
        var x ProbeResult
        err = json.Unmarshal([]byte(probeResultJson), &x)
        if err != nil {
            c.err = err
            return
        }
        parts := strings.Split(x.Format.Duration, ".")
        sec,err := strconv.ParseUint(parts[0],10,32)
        if err != nil {
            c.err = err
            return
        }
        us,err := strconv.ParseUint(parts[1],10,32)
        if err != nil {
            c.err = err
            return
        }
        duration := (sec * 1000) + (us / 1000)

        cmd := ffmpeg.Input(inFileName).
            Output(outFileName, ffmpeg.KwArgs{ "progress": "pipe:1" }).
            OverWriteOutput().
            Compile()

        stdout, err := cmd.StdoutPipe()
        if err != nil {
            c.err = err
            return
        }
        if err := cmd.Start(); err != nil {
            c.err = err
            return
        }

        scanner := bufio.NewScanner(stdout)
        for scanner.Scan() {
            line := scanner.Text()
            if strings.HasPrefix(line, "out_time_us=") {
                time,err := strconv.ParseUint(strings.Split(line, "=")[1],10,64)
                if err != nil {
                    c.err = err
                    return
                }
                time = time / 1000
                time = min(time, duration)
                percent := uint8((time * 100) / duration)
                c.onProgressUpdate(percent)
            }
        }

        err = os.Remove(inFileName)
        if err != nil {
            c.err = err
            return
        }
    }()
}

