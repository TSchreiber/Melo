package yt_dlp

import (
	"bufio"
	"io"
	"os/exec"
	"strconv"
	"strings"
	"sync"
)

type Downloader struct {
    onProgressUpdate func(uint8)
    wg sync.WaitGroup
    filepath string
    err error
}

func (d *Downloader) OnProgressUpdate(onProgressUpdate func(uint8)) {
    d.onProgressUpdate = onProgressUpdate
}

func (d *Downloader) Wait() {
    d.wg.Wait()
}

//returns the filepath of the downloaded audio file or the first error that occured
func (d *Downloader) GetFilepath() (string,error) {
    return d.filepath,d.err
}

// Asynchronously downloades the file
func (d *Downloader) DownloadAudio(vid string) {
    d.wg.Add(1)
    go func() {
        defer d.wg.Done()
        cmd := exec.Command("yt-dlp", "--newline", "--extract-audio",
            "-o", "%(id)s.%(ext)s", vid)
        stdout, err := cmd.StdoutPipe()
        if err != nil {
            d.err = err
            return
        }
        defer stdout.Close()

        err = cmd.Start()
        if err != nil {
            d.err = err
            return
        }

        reader := bufio.NewReader(stdout)
        var bytes []byte
        for err != io.EOF {
            bytes,_,err = reader.ReadLine()
             if err != nil && err != io.EOF {
                 d.err = err
                 return
            }
            line := string(bytes)
            if msg,ok := strings.CutPrefix(line, "[ExtractAudio] "); ok {
                if dest,ok := strings.CutPrefix(msg, "Destination: "); ok {
                    d.filepath = dest
                }
                continue
            }
            msg,ok := strings.CutPrefix(line, "[download] ")
            if !ok {
                continue
            }
            i := strings.IndexByte(msg, '%')
            if i == -1 {
                continue
            }
            percentF, err := strconv.ParseFloat(strings.TrimSpace(msg[0:i]), 32)
            if err != nil {
                continue
            }
            percent := uint8(percentF)
            d.onProgressUpdate(percent)
        }
    }()
}


