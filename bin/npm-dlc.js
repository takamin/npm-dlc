#! /usr/bin/env node
"use strict";
const debug = require("debug")("npm-dlc");
const GetOpt = require("node-getopt");
const HashArg = require("hash-arg");
const listit = require("list-it");
const NpmPackage = require("../index.js");

const PARAMETERS = ["username:string[]"];
const OPTIONS = [
    ["s", "sort=COLUMN", "Sort by the column."],
    ["d", "desc", "Sort in descending order."],
    ["v", "version", "Print version."],
    ["h", "help", "Print this message."],
];
const COLUMNS_AND_SORTER = {
    NAME: (a,b) => (a.NAME < b.NAME ? -1 : a.NAME > b.NAME ? 1 : 0),
    VERSION: (a,b) => {
        const ver2val = ver => (ver.split(".").map(e => parseInt(e)));
        const va = ver2val(a.VERSION);
        const vb = ver2val(b.VERSION);
        debug(`${a.VERSION} <=> ${b.VERSION}`);
        for(;;) {
            const ea = va.shift() || 0;
            const eb = vb.shift() || 0;
            debug(`ea ${ea} <=> eb ${eb}`);
            if(ea < eb) return -1;
            if(ea > eb) return 1;
            if(va.length == 0 || vb.length == 0) {
                break;
            }
        }
        return 0;
    },
    PUBLISHED: (a,b) => {
        const UV = {
            "second": 1000, "minute": 1000 * 60, "hour": 1000 * 60 * 60,
            "day": 1000 * 60 * 60 * 24, "week": 1000 * 60 * 60 * 24 * 7,
            "month": 1000 * 60 * 60 * 24 * 31,
            "year": 1000 * 60 * 60 * 24 * 366,
        };
        const ps2v = ps => {
            const [n, unit] = ps.split(/\s+/);
            return (n === "a" ? 1 : parseInt(n)) * UV[unit.replace(/s$/, "")];
        };
        return ps2v(a.PUBLISHED) - ps2v(b.PUBLISHED);
    },
    DAILY: (a,b) => (a.DAILY - b.DAILY),
    WEEKLY: (a,b) => (a.WEEKLY - b.WEEKLY),
    MONTHLY: (a,b) => (a.MONTHLY - b.MONTHLY),
};
const USAGE =
`Usage: npm-dlc <username> ... [OPTIONS]
Report download count of all npm packages owned by the users.

PARAMETER:
username - the npm username

OPTIONS:
[[OPTIONS]]

Available words For parameter COLUMN for the sort option are following:
${Object.keys(COLUMNS_AND_SORTER).map(name => `* ${JSON.stringify(name)}`).join("\r\n")}`;

const getopt = GetOpt.create(OPTIONS).bindHelp(USAGE);

const main = async () => {
    try {
        const { options, argv } = getopt.parseSystem();
        const params = HashArg.get(PARAMETERS, argv);
        debug(JSON.stringify(options));
        debug(JSON.stringify(params));
        if(options.version) {
            printVersion();
            process.exit(1);
        }
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
            debug(JSON.stringify(dataList, null, 2));
            if(options.sort) {
                const column = options.sort;
                const sorter = COLUMNS_AND_SORTER[column];
                if(!sorter) {
                    console.log(`Error: Unknown column ${JSON.stringify(column)}`);
                    console.log(`Available column: ${Object.keys(COLUMNS_AND_SORTER).map(name=>JSON.stringify(name)).join(", ")}`);
                    process.exit(1);
                }
                dataList.sort(sorter);
            }
            if(!options.desc) {
                report(userName, dataList);
            } else {
                report(userName, dataList.reverse());
            }
            done[userName] = true;
        }
    } catch(err) {
        console.error(`Error: ${err.message}`);
        debug(err.stack);
    }
};

const printVersion = ()=>{
    const pkg = require(`${__dirname}/../package.json`);
    console.error(`${pkg.version}`);
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

main();
