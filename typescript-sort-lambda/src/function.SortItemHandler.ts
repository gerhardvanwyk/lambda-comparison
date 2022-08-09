import {APIGatewayProxyEvent, APIGatewayProxyResult, Context} from 'aws-lambda';
import {Metrics, MetricUnits} from '@aws-lambda-powertools/metrics';
import {Logger} from '@aws-lambda-powertools/logger';
import {Tracer} from '@aws-lambda-powertools/tracer'
import {GetQueueUrlCommand, SendMessageCommand, SQSClient} from "@aws-sdk/client-sqs";
import {EventModel} from "./model";
import {MetricsOptions} from "@aws-lambda-powertools/metrics/lib/types";

const nano = require('nanoseconds');

// Create the PowerTools clients
// powertools doc: https://github.com/awslabs/aws-lambda-powertools-typescript
const metrics = new Metrics();
const logger = new Logger();
const tracer = new Tracer();

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */
export const functionSortItemHandler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    const start = new Date().getTime();
    let url = null;
    let client;
    let desc = '';
    let sort = '';

    try {
        if (event.httpMethod !== 'POST') {
            throw new Error(`sort Item only accepts POST method, you tried ${event.httpMethod}`)
        }

        // Tracer: Get facade segment created by AWS Lambda
        const segment = tracer.getSegment();

        //Tracer: Create subsegment for the function & set it as active
        const handlerSegment = segment.addNewSubsegment(`## ${process.env._HANDLER}`);
        tracer.setSegment(handlerSegment);

        //Tracer: Annotate the subsegment with cold start & serviceName
        tracer.annotateColdStart();
        tracer.addServiceNameAnnotation();

        //Tracer: Add annotation for the awsRequestId
        tracer.putAnnotation('awsRequestId', context.awsRequestId);

        //Metrics: Capture cold start metrics
        metrics.captureColdStartMetric();

        //Logger: add persistent attributes to each log statement
        logger.addPersistentLogAttributes({
            awsRequestId: context.awsRequestId
        });
        client = new SQSClient({ region: "REGION" });

        url = await client.send(new GetQueueUrlCommand({ QueueName: "TQueue"}))

        let response;
        try {

            if (!event.body) {
                throw new Error('Event does not contain body');
            }

            let model = new EventModel();
            let json = event.body ?? '{}';
            // @ts-ignore
            JSON.parse(json, model);

            desc = model.getDescription();
            sort = model.getSort();

            switch(sort){
                case 'bubble': {
                    model.getLines().every((l, i) => {
                        driver(bubbleSort, l.data, i, desc);
                    });
                    break;
                }
                case 'insertion':{
                    model.getLines().every( (l, i) => {
                        driver(insertionSort, l.data, i, desc);
                    });
                    break;
                }
                case 'quick':{
                    model.getLines().every( (l, i) => {
                        driver(quickSort, l.data, i, desc);
                    });
                    break;
                }
                case 'radix' : {
                    model.getLines().every( (l, i) => {
                        driver(radixSortLSD, l.data, i, desc);
                    });
                    break;
                }
                default : {
                    throw new Error("Sort type not supported ".concat(sort))
                }
            }

            //Tracer: Close subsegment (the AWS Lambda one is closed automatically )
            response = {
                statusCode: 200,
                body: JSON.stringify({})
            }
        } catch (err) {
            tracer.addErrorAsMetadata(err as Error);
            logger.error('' + err);
            response = {
                statusCode: 500,
                body: JSON.stringify({'error': ''})
            };
        } finally {
            handlerSegment.close();
        }

        // Tracer: Set the facade segment as active again (the one created by AWS Lambda)
        tracer.setSegment(segment);
        // All log statements are written to CloudWatch
        logger.info(`response from: ${event.path} statusCode: ${response.statusCode} body: ${response.body}`);
        return response;
    }finally {
        let elapsed = new Date().getTime() - start;
        metrics.addMetric(desc.concat(".").concat(sort).concat("elapsed-time"), MetricUnits.Milliseconds, elapsed)

        if(client && url) {
            const msg = `{"description":"`.concat(desc)
                .concat(`", "sort":`).concat(sort)
                .concat(`", "elapsed-time":"`).concat(String(elapsed)).concat(`"}`);
            await client.send(new SendMessageCommand({QueueUrl: url.QueueUrl, MessageBody: msg}));
        }
    }
};

function bubbleSort(array: number[]): number[] {
    array = array.slice(); // creates a copy of the array

    for(let i = 0; i < array.length; i++) {
        for(let j = 0; j < array.length - 1; j++) {

            if(array[j] > array[j + 1]) {
                let swap = array[j];
                array[j] = array[j + 1];
                array[j + 1] = swap;
            }
        }
    }
    return array;
}

function insertionSort(list: number[]): number[] {

    IndexIterator:
        for (let i = 1; i < list.length; i++) {

            const valueToSort = list[i];

            InsertionIterator:
                for (let j = i - 1; j >= 0; j--) {
                    if (valueToSort >= list[j]) {
                        list[j + 1] = valueToSort;
                        continue IndexIterator;
                    } else {
                        list[j + 1] = list[j];
                        list[j] = valueToSort;
                        continue InsertionIterator;
                    }
                }
        }

    return list;
}

// --- quick Sort
function quickSort(arr: Array<number>,
    start: number = 0,
    end: number = arr.length
): Array<number> {
    if (start < end) {
        let p = partition(arr, start, end);
        quickSort(arr, start, p - 1);
        quickSort(arr, p + 1, end);
    }
    return arr;
}

function partition(
    arr: Array<number>,
    start: number = 0,
    end: number = arr.length
) {
    let pivot: number = arr[start];
    let swapIndex: number = start;
    for (let i = start + 1; i < end; i++) {
        if (arr[i] < pivot) {
            swapIndex++;
            swap(arr, i, swapIndex);
        }
    }
    swap(arr, start, swapIndex);
    return swapIndex;
}

function swap(arr: Array<number>, i: number, j: number) {
    let temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
}

// ----

//--- Radix Sort
/**
 * Counting sort by digit
 *
 * @param {Array<number>} array
 * @param {number} exponent
 * @returns {Array<number>}
 */
function countingSort(array: Array<number>, exponent: number): Array<number> {
    let bucketIndex;
    const buckets = [];
    const output = [];

    // Initialize bucket
    for (let i = 0; i < 10; i++) {
        buckets[i] = 0;
    }

    // Count frequencies per bucket
    for (let i = 0; i <array.length; i++) {
        bucketIndex = Math.floor(((array[i]) / exponent) % 10);
        buckets[bucketIndex]++;
    }

    // Modify the count array such that each element at each index
    // stores the sum of previous counts.
    for (let i = 1; i < 10; i++) {
        buckets[i] += buckets[i - 1];
    }

    // Output each object from the input sequence followed by
    // decreasing its count by 1
    for (let i = array.length - 1; i >= 0; i--) {
        bucketIndex = Math.floor(((array[i]) / exponent) % 10);
        output[--buckets[bucketIndex]] = array[i];
    }

    return output;
}

/**
 * Radix Sort
 *
 * @param {Array<number>} array
 * @returns {Array<number>}
 */
function radixSortLSD(array: Array<number>): Array<number> {
    if (array.length === 0) {
        return array;
    }

    const maxValue = Math.max(...array);

    // Perform counting sort on each exponent/digit
    var exponent = 1;
    while ((maxValue) / exponent >= 1) {
        array = countingSort(array, exponent);

        exponent *= 10;
    }

    return array;
}
/// -------- /// -------- ///

function driver(sortF: Function, list : Array<number>, i : number, desc : string){
    const st = nano(process.hrtime());
    const res = sortF(list);
    const et = st - nano(process.hrtime());
    logMetric(i, res, et, desc);

}

function logMetric(i: number, res: number[], et: number, desc : string) {
    const metric = new Metrics(
        {
            namespace: desc,
            serviceName: "ListNumber: ".concat(String(i).concat(" Size: ").concat(String(res.length)))
        }
    );
    //The time is measured in Nano Seconds but the Metrics only cater for Milli seconds
    //Therefore we use a none nonsensical Unit of Count
    metric.addMetric("LiTi", MetricUnits.Count, et)
}