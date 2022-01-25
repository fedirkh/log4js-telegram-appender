'use strict';

const got = require("got");

// This is the function that generates an appender function
function stdoutAppender(layout, levels, config) {
    const silentLevel = levels.getLevel(config.silentAlertLevel);
    const audioLevel = levels.getLevel(config.audioAlertLevel);
    const msgTitle = config.msgTitle;
    let tgApiUrl = 'https://api.telegram.org'
    const urlRegExp = /(http|https):\/\/([\w.]+\/?)\S*/
    const tgApiUrl4Conf = config.tgApiUrl
    if (urlRegExp.test(tgApiUrl4Conf)) {
        if (tgApiUrl4Conf.charAt(tgApiUrl4Conf.length - 1) == "/") {
            tgApiUrl = tgApiUrl4Conf.substring(0, tgApiUrl4Conf.length - 1)
        } else {
            tgApiUrl = tgApiUrl4Conf
        }
    }
    const sentMessageRoute = `${tgApiUrl}/bot${config.bottoken}/sendMessage`;
    const botchat_params = {
        searchParams: {
            chat_id: config.botchatid,
            parse_mode: "html"
        }
    };
    // This is the appender function itself
    return async (loggingEvent) => {
        const params = JSON.parse(JSON.stringify(botchat_params));
        if (silentLevel?.isLessThanOrEqualTo(loggingEvent.level.levelStr)) {
            Object.assign(params.searchParams, {
                text: msgTitle ? `${msgTitle}\n${layout(loggingEvent)}` : layout(loggingEvent),
                disable_notification: audioLevel.isLessThanOrEqualTo(loggingEvent.level.levelStr) ? true : false
            });
            try {
                await got(sentMessageRoute, params);
            } catch (error) {
                console.error("Error sending to telegram:");
                console.error(error);
            }
        }
    };
}

function configure(config, layouts, findAppender, levels) {

    // the default custom layout for this appender, not using the layouts module
    const default_layout = function (loggingEvent) {
        const header = `<b>${loggingEvent.categoryName}: ${loggingEvent.level}</b>\n`;
        const timestamp = `[${loggingEvent.startTime.toISOString()}]\n`;
        const body = loggingEvent.data.map(d => {
            try {
                if (typeof d === 'object') return JSON.stringify(d);
            } catch (e) {
                //ignore
            }

            return d.toString();
        }).join("\n");
        return header + timestamp + body;
    };

    const use_layout = config.layout ? layouts.layout(config.layout.type, config.layout) : default_layout;

    //create a new appender instance
    return stdoutAppender(use_layout, levels, config);
}

//export the only function needed
exports.configure = configure;