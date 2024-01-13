/** @module ActionBar */

import Auth from "./auth.mjs"
import Navigation from "./navigation.mjs"

/** @type {HTMLElement} */
var _homeButton;
/** @type {HTMLElement} */
var _searchButton;
/** @type {HTMLElement} */
var _accountButton;
/** @type {HTMLElement} */
var _accountMenu;
/** @type {HTMLElement} */
var _settingsButton;

window.addEventListener("load", () => {
    _homeButton = getElementByIdOrError("home-button");
    _searchButton = getElementByIdOrError("search-button");
    _accountButton = getElementByIdOrError("account-button");
    _accountMenu = getElementByIdOrError("account-menu");
    let logOutButton = getElementByIdOrError("log-out-button");
    _settingsButton = getElementByIdOrError("settings-button");

    _accountButton.addEventListener("click", () => {
         _accountMenu.classList.toggle("hidden");
        /** @type {EventListener} */
        let listener = (e) => {
            let target = /** @type {HTMLElement} */ (e.target);
            if (target == _accountButton) {
                document.body.removeEventListener("click", listener);
            }
            if (target != _accountButton && !_accountMenu.contains(target)) {
                 _accountMenu.classList.add("hidden");
                document.body.removeEventListener("click", listener);
            }
        }
        setTimeout(() => document.body.addEventListener("click", listener), 0);
    });
    _setAccountUsername();

    logOutButton.addEventListener("click", () => {
        Auth.logOut();
    });

    let homePanel = getElementByIdOrError("home-panel");
    _homeButton.addEventListener("click", () => {
        Navigation.setActivePanel(homePanel);
    });

    let searchPanel = getElementByIdOrError("search-panel");
    _searchButton.addEventListener("click", () => {
        Navigation.setActivePanel(searchPanel);
    });
});

async function _setAccountUsername() {
    let el = document.getElementById("account-menu-username");
    if (!el) return;
    let idToken = Auth.getIdToken() || await Auth.refreshIdToken();
    if (!idToken) return;
    let claims = Auth.decode(idToken);
    el.innerText = claims.email;
}

/**
 * @private
 * @param {string} id
 * @returns {HTMLElement}
 */
function getElementByIdOrError(id) {
    let el = document.getElementById(id);
    if (!el) throw new Error(`"${id}" is undefined`);
    return el;
}

const ActionBar = { };
export default ActionBar;
