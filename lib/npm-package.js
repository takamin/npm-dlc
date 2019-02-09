"use strict";
const request = require("request");
const parseHtml = require("node-html-parser").parse;

const NpmPackage = { };

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
    const base = "https://www.npmjs.com";
    const url = `${base}/~${userName}`;
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
            url: `${base}/packages/${name}`
        };
    });
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
    // API description https://github.com/npm/download-counts
    const base = "https://api.npmjs.org/downloads/point";
    const [daily, weekly, monthly] = await Promise.all(
        ["last-day", "last-week", "last-month"].map( async range => {
            const url = `${base}/${range}/${packageName}`;
            const contents = await file_get_contents(url);
            return JSON.parse(contents).downloads || 0;
        }));
    return {daily, weekly, monthly};
};

/**
 * Get HTTP response body as a string.
 *
 * @async
 * @param {string} url an URL to request.
 * @returns {string} HTTP response body of the URL.
 */
const file_get_contents = async url => {
    return await new Promise( (resolve, reject) => {
        request(url, (err, response, body) => {
            if(err) {
                reject(err);
                return;
            }
            resolve(body);
        });
    });
};

module.exports = NpmPackage;

