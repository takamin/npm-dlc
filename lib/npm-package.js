"use strict";
const debug = require("debug")("npm-package");
const axios = require("axios");
const parseHtml = require("node-html-parser").parse;

const NpmPackage = { };

NpmPackage.WebSiteBase = "https://www.npmjs.com";

// API description https://github.com/npm/download-counts
NpmPackage.DownloadCountApi = "https://api.npmjs.org/downloads/point";

/**
 * Get npm pakage list owned by specific user.
 * The schema of the element of returned array is:
 *
 * ```json
 * {
 *     "type": "array", "items": {
 *         "type": "object", "properties": {
 *             "name": {
 *                 "type": "string",
 *                 "description": "A package name"
 *             },
 *             "version": {
 *                 "type": "string",
 *                 "description": "The package version"
 *             },
 *             "published": {
 *                 "type": "string",
 *                 "description": "A rough time that the package was published",
 *             },
 *             "url": {
 *                 "type": "string",
 *                 "description": "An address of a page published"
 *             }
 *         }
 *     }
 * }
 * ```
 *
 * @async
 * @param {string} userName An user name of npm.
 * @returns {Array<object>} An array of package information.
 */
NpmPackage.getPackageListOfUser = async userName => {
    const url = `${NpmPackage.WebSiteBase}/~${userName}`;
    try {
        const contents = await file_get_contents(url);
        const user_html = parseHtml(contents);

        const sections = user_html.querySelectorAll("section");
        return sections.map(li => {
            const name = li.querySelector("h3").text;
            const pubinfo = li.querySelector("div span").text.split(" ");
            const version = pubinfo[1];
            const published = pubinfo.slice(3).join(" ");
            return {
                name, version, published,
                url: `${NpmPackage.WebSiteBase}/packages/${name}`
            };
        });
    } catch(err) {
        console.error(`Error in NpmPackage.getPackageListOfUser: ${err.message}`);
    }
};

/**
 * ,
 * Get latest download count of the specific package.
 * It is a value counted in last day, last week and last month.
 *
 * The schema of the returned object is:
 *
 * ```json
 * {
 *     "type": "object",
 *     "properties": {
 *         "daily": {
 *             "type": "number",
 *             "description": "A download count of the last day"
 *         },
 *         "weekly": {
 *             "type": "number",
 *             "description": "A download count of the last week"
 *         },
 *         "monthly": {
 *             "type": "number",
 *             "description": "A download count of the last month"
 *         }
 *     }
 * }
 * ```
 *
 * @async
 * @param {string} packageName A package name.
 * @returns {object} A download count 
 */
NpmPackage.getLatestDownloads = async packageName => {
    try {
        const [daily, weekly, monthly] = await Promise.all(
            ["last-day", "last-week", "last-month"].map( async range => {
                try {
                    const url = `${NpmPackage.DownloadCountApi}/${range}/${packageName}`;
                    const contents = await getJson(url);
                    return contents.downloads || 0;
                } catch(err) {
                    console.error(`Error in NpmPackage.getLatestDownloads: ${err.message}`);
                }
            })
        );
        return {daily, weekly, monthly};
    } catch(err) {
        console.error(`Error in NpmPackage.getLatestDownloads: ${err.message}`);
    }
};

/**
 * Get HTTP response body as a string.
 *
 * @async
 * @param {string} url an URL to request.
 * @returns {string} HTTP response body of the URL.
 */
const file_get_contents = url => {
    debug(`file_get_contents: url ${url}`);
    return axios.get(url, {
        responseType:"text",
    }).then(response => {
        debug(`file_get_contents: request get ${url}`);
        debug(`file_get_contents: ===> response.data: ${response.data}`);
        return response.data;
    }).catch(err => {
        console.error(`Error in file_get_contents: ${err.message}`);
        debug(`Error: file_get_contents: ${url}`);
        debug(err.stack);
    });
    return "";
};

/**
 * Get JSON
 *
 * @async
 * @param {string} url an URL to request.
 * @returns {string} HTTP response body of the URL.
 */
const getJson = url => {
    debug(`getJson: url ${url}`);
    return axios.get(url).then(response => {
        debug(`getJson: request get ${url}`);
        debug(`getJson: ===> response.data: ${JSON.stringify(response.data)}`);
        return response.data;
    }).catch(err => {
        console.error(`Error in getJson: ${err.message}`);
        debug(`Error: getJson: ${url}`);
        debug(err.stack);
    });
    return "";
};
module.exports = NpmPackage;

