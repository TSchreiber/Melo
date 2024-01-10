/** @module Auth */

/**
* The name of the token in storage. This is the identifier that will be used
* to store and retrieve the token.
* @constant
* @type {string}
* @default
*/
const idTokenName = "keywe_id_token";

/**
* The name of the token in storage. This is the identifier that will be used
* to store and retrieve the token.
* @constant
* @type {string}
* @default
*/
const refreshTokenName = "keywe_refresh_token";

/**
* Fetches the id token. If the id token is expired, this function will
* return null and remove the token from storage.
* @public
* @return {string|null}
*/
function getIdToken() {
    let idToken = sessionStorage.getItem(idTokenName);
    if (!idToken) return null;
    if (isExpired(idToken)) {
        sessionStorage.removeItem(idTokenName);
        return null;
    }
    return idToken;
}

/**
* Fetches the refresh token. If the refresh token is expired, this function will
* return null and remove the token from storage.
* @return {string|null}
*/
function getRefreshToken() {
    let refreshToken = localStorage.getItem(refreshTokenName);
    if (!refreshToken) return null;
    if (isExpired(refreshToken)) {
        localStorage.removeItem(refreshTokenName);
        return null;
    }
    return refreshToken;
}

/**
* Uses the refresh token to renew the id token.
* @return {Promise<string|null>} The value of the new id token.
*/
function refreshIdToken() {
    return new Promise(async (resolve, reject) => {
        let refreshToken = getRefreshToken();
        if (!refreshToken) {
            resolve(null);
            return;
        }
        let refreshUrl = await (await fetch("/auth/refresh_url")).text();
        let headers = new Headers();
        headers.set("Content-Type", "application/json");
        try {
            let res = await fetch(refreshUrl, {
                method: "POST",
                headers,
                body: JSON.stringify({ refresh_token: refreshToken })
            });
            if (res.status == 403) {
                // Refresh token is invalid
                resolve(null);
                sessionStorage.setItem("auth_redirect", window.location.href);
                window.location.href = "/login";
                return;
            }
            if (!res.ok) {
                throw new Error(`${res.status} ${res.statusText}`);
            }
            let tokens = await res.json();
            if (!tokens.id_token) {
                resolve(null);
            } else {
                sessionStorage.setItem(idTokenName, tokens.id_token);
                resolve(tokens.id_token);
            }
        } catch (err) {
            reject(err)
        }
    });
}

/** */
function logOut() {
    sessionStorage.removeItem(idTokenName);
    localStorage.removeItem(refreshTokenName);
    window.location.href = "/";
}

/**
 * Decodes the payload (claims) of the provided JSON Web Token (JWT)
 * @param {string} token
 * @returns {Object} payload
 */
function decode(token) {
    let encodedClaims = token.split(".")[1];
    let claimsString = atob(encodedClaims);
    let claims = JSON.parse(claimsString);
    return claims;
}

/**
* @private
* @param {string} token
* @returns {boolean}
*/
function isExpired(token) {
    let encodedClaims = token.split(".")[1];
    let claimsString = atob(encodedClaims);
    let claims = JSON.parse(claimsString);
    if (!claims.exp) return true;
    let expMillis = new Date(claims.exp * 1000).getTime();
    if (expMillis < Date.now()) return true;
    return false;
}

const auth = {
    getIdToken,
    getRefreshToken,
    refreshIdToken,
    logOut,
    decode,
};
export default auth;
