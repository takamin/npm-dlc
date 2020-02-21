#! /usr/bin/env node
"use strict";
const debug = require("debug")("npm-dlc");
const listit = require("list-it");
const NpmPackage = require("../index.js");

const main = async argv => {
    try {
        if(argv.length == 0) {
            console.error("Error: no user name specified");
            console.error("Usage: npm-dlc {{npm-user-name}}");
            process.exit(1);
        }
        const done = {};
        for(const userName of argv) {
            if(userName in done) {
                console.error(`Warning: Skip ${userName} ...`);
                continue;
            }
            done[userName] = false;
            const dataList = await reportDownloadCountsOf(userName);
            if(dataList == null) {
                console.error(`Warning: No data for ${userName}`);
                continue;
            }
            report(userName, dataList);
            done[userName] = true;
        }
    } catch(err) {
        console.error(`Error: ${err.message}`);
        debug(err.stack);
    }
};

const reportDownloadCountsOf = async userName => {
    try {
        const packageList = await NpmPackage.getPackageListOfUser(userName);
        if(packageList.length == 0) {
            return null;
        }
        const dataList = await Promise.all(packageList.map(async item => {
            const count = await NpmPackage.getLatestDownloads(item.name);
            return {
                NAME: item.name,
                VERSION: item.version,
                PUBLISHED: item.published,
                DAILY: count.daily,
                WEEKLY: count.weekly,
                MONTHLY: count.monthly,
            };
        }));
        return dataList;
    } catch(err) {
        console.error(`Error: ${err.message}`);
        debug(err.stack);
    }
};

const report = (userName, listItDataObject) => {
    const timestamp = (new Date()).toLocaleString();
    const buf = listit.buffer({ autoAlign: true });
    const separator = createListItSeparator(listItDataObject);

    listItDataObject.unshift(separator);
    listItDataObject.push(separator);

    console.log("");
    console.log(`Download count of public package published by ${userName}`);
    console.log(`(${NpmPackage.WebSiteBase}/~${userName})`);
    console.log("");
    console.log(Object.values(separator).join(" "));
    console.log(buf.d(listItDataObject).toString());
    console.log(`This list was created at ${timestamp}`);
};

const createListItSeparator = dataset => {
    const kvLength = dataset.reduce( (acc, item) => {
        Object.keys(item).forEach( key => {
            const vLen = item[key].toString().length;
            const kLen = key.length;
            const len = (vLen > kLen ? vLen : kLen);
            if(!(key in acc) || len > acc[key]) {
                acc[key] = len;
            }
        });
        return acc;
    }, {});
    const separator = Object.keys(kvLength).reduce( (acc, key) => {
        acc[key] = "-".repeat(kvLength[key]);
        return acc;
    }, {});
    return separator;
};

main(process.argv.slice(2));
