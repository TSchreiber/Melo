![Melo Logo](/static/images/logo-128px-bg.png)
## Music Streaming Service
Melo uses [yt-dlp](https://github.com/yt-dlp/yt-dlp) to aggregate songs from various sources such as YouTube and SoundCloud into a single library.
### How it works
Melo uses [KeyWe](https://github.com/TSchreiber/KeyWe) for user authentication and [MongoDB](mongodb.com) as a database.

The website is developed with a client-side rendering (CSR) architecture. When a client visits the site, they will be given an html page and a few JavaScript files that handle interacting with the API layer and dynamically populating the page's content. The user must be authenticated to access any of the API's endpoints, so the client code checks if they are authenticated and redirects them to KeyWe if they need to log in. Once the user is logged in, the client code will fetch their playlists from the API.

#### Downloading songs

Besides listening to music, the other major feature of Melo is downloading music with yt-dlp. Access to the `/download` endpoint is currently restricted to administrator users to prevent excessive usage, but it is planned to be made public (with rate limiting) in the future.

Administrator users can access the download page by navigating to `/download_song.html`. From there you can insert the URL of the song you want to download. If it is a YouTube video, you can input the full URL, short URL from the share button, or just the video id. After you click next, Melo will fetch the song's metadata from the provided URL and extract the song's details.

The song's details will be presented to you in a form where you can double check that it is correct and edit it if necessary. Once you click next, the song will be downloaded and the download progress will be relayed to you. Once it says done, you can go back to the home page and find it in the search.

#### Media session API

Melo uses the [Media Session API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API) to provide users with access to song details and playback controls through whatever means the user's browser provides them (such as keyboard media keys and browser pop-up menus).

![Screenshot showing Google Chrome's media control interacting with Melo](/static/images/media_session_api_example.png)
