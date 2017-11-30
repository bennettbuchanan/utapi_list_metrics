const http = require('http');
const https = require('https');
const commander = require('commander');
const { auth } = require('arsenal');
const werelogs = require('werelogs');

werelogs.configure({
    level: 'info',
    dump: 'error',
});

const logger = new werelogs.Logger('S3');

/**
 * Make the request to Utapi with the given values.
 */
function utapiRequest(host, port, metric, metricType, timeRange, accessKey,
    secretKey, verbose, recent, ssl) {
    const listAction = 'ListMetrics';
    const options = {
        host,
        port,
        method: 'POST',
        path: `/${metric}?Action=${listAction}`,
        headers: {
            'content-type': 'application/json',
            'cache-control': 'no-cache',
        },
        rejectUnauthorized: false,
    };
    const transport = ssl ? https : http;
    const request = transport.request(options, response => {
        if (verbose) {
            logger.info('response status code', {
                statusCode: response.statusCode,
            });
            logger.info('response headers', { headers: response.headers });
        }
        const body = [];
        response.setEncoding('utf8');
        response.on('data', chunk => body.push(chunk));
        response.on('end', () => {
            const responseBody = JSON.parse(body.join(''));
            if (response.statusCode >= 200 && response.statusCode < 300) {
                process.stdout.write(JSON.stringify(responseBody, null, 2));
                process.stdout.write('\n');
                process.exit(0);
            } else {
                logger.error('request failed with HTTP Status ', {
                    statusCode: response.statusCode,
                    body: responseBody,
                });
                process.exit(1);
            }
        });
    });
    request.path = `/${metric}`;
    auth.client.generateV4Headers(request, { Action: listAction }, accessKey,
        secretKey, 's3');
    request.path = `/${metric}?Action=${listAction}`;
    if (verbose) {
        logger.info('request headers', { headers: request._headers });
    }
    const requestObj = { timeRange };
    requestObj[metric] = metricType;
    request.write(JSON.stringify(requestObj));
    request.end();
}

/**
 * Parse command line options and validate all values are correct before making
 * the request to Utapi.
 */
function listMetrics() {
    commander
        .option('-a, --access-key <accessKey>', 'Access key id')
        .option('-k, --secret-key <secretKey>', 'Secret access key')
        .option('-m, --metric <metric>', 'Metric type')
        .option('--buckets <buckets>', 'Name of bucket(s) with a comma ' +
            'separator if more than one')
        .option('--accounts <accounts>', 'Account ID(s) with a comma ' +
            'separator if more than one')
        .option('--users <users>', 'User ID(s) with a comma separator if ' +
            'more than one')
        .option('--service <service>', 'Name of service')
        .option('-s, --start <start>', 'Start of time range')
        .option('-r, --recent', 'List metrics including the previous and ' +
            'current 15 minute interval')
        .option('-e --end <end>', 'End of time range')
        .option('--host <host>', 'Host of the server')
        .option('--port <port>', 'Port of the server')
        .option('--ssl', 'Enable ssl')
        .option('-v, --verbose')
        .parse(process.argv);

    const { host, port, accessKey, secretKey, start, end, verbose, recent,
        ssl } = commander;
    const requiredOptions = { host, port, accessKey, secretKey };
    requiredOptions.metric = commander.metric;
    const validMetrics = ['buckets', 'accounts', 'users', 'service'];
    if (validMetrics.indexOf(commander.metric) < 0) {
        logger.error(`metric must be one of '${validMetrics.join("', '")}'`);
        commander.outputHelp();
        process.exit(1);
    }
    const metric = commander.metric;
    requiredOptions[metric] = commander[metric];
    // If not a listing of latest metrics, the start option must be provided.
    if (!recent) {
        requiredOptions.start = commander.start;
    }
    Object.keys(requiredOptions).forEach(option => {
        if (!requiredOptions[option]) {
            logger.error(`missing required option: ${option}`);
            commander.outputHelp();
            process.exit(1);
        }
    });
    const timeRange = [];
    if (recent) {
        const time = new Date(Date.now())
        const minutes = time.getMinutes();
        const timestamp = time.setMinutes((minutes - minutes % 15), 0, 0);
        // Also include the previous 15 minute interval in case the interval
        // has passed immediately before this request is made.
        const numStart = timestamp - 900000;
        timeRange.push(numStart);
    } else {
        const numStart = Number.parseInt(start, 10);
        if (!numStart) {
            logger.error('start must be a number');
            commander.outputHelp();
            process.exit(1);
        }
        timeRange.push(numStart);
        if (end) {
            const numEnd = Number.parseInt(end, 10);
            if (!numEnd) {
                logger.error('end must be a number');
                commander.outputHelp();
                process.exit(1);
            }
            timeRange.push(numEnd);
        }
    }
    // The string `commander[metric]` is a comma-separated list of resources
    // given by the user.
    const resources = commander[metric].split(',');
    utapiRequest(host, port, metric, resources, timeRange, accessKey, secretKey,
        verbose, recent, ssl);
}

listMetrics();
