
import {aws_sqs, Duration, Stack, StackProps} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Function } from './function';

/**
 * Create the stack
 */
export class AppStack extends Stack{
    public constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        // The code that defines your stack goes here

        const queue = new aws_sqs.Queue(this, 'TQueue', {
            visibilityTimeout: Duration.seconds(300)
        });


        new Function(this, 'SortItemHandler', {
            functionName: 'SortItemHandler',
            tracingActive: true,
            queueUrl: queue.queueUrl
        });


    }
}