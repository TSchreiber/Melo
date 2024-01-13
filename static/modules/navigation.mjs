/** @module Navigation */

/** @type {HTMLElement} */
var _activePanel;

/**
 * @param {HTMLElement} htmlElement
 */
function setActivePanel(htmlElement) {
    if (_activePanel) {
        _activePanel.classList.add("hidden");
    }
    htmlElement.classList.remove("hidden");
    _activePanel = htmlElement;
}

export default {
    setActivePanel,
}
