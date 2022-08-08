import { APIGatewayProxyEvent, APIGatewayProxyResult, Context} from 'aws-lambda';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer'
import { SNSClient } from "@aws-sdk/client-sns";

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
    let client;
    let name;
    let sort;
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
        client = new SNSClient({ region: "REGION" });
        let response;
        try {

            //TODO 1. Read JSON config
            //TODO 2. Implement model
            //TODO 3. Implement sorts
            //TODO 4. Run sort

            if (!event.body) {
                throw new Error('Event does not contain body');
            }

            // Get id and name from the body of the request
            const body = JSON.parse(event.body);
            const id = body.id;
            name = body.name;

            sort = "bubble";

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
        if(client) {
            const msg = name.concat(" s:").concat(sort).concat(" t:").concat(elapsed);
            await client.send(msg);
        }
    }
};