
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Function } from './function';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

/**
 * Create the stack
 */
export class AppStack extends Stack{
    public constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);


        new Function(this, 'SortItemHandler', {
            functionName: 'SortItemHandler',
            tracingActive: true,
        });

        // The code that defines your stack goes here

        // example resource
        // const queue = new sqs.Queue(this, 'TmpQueue', {
        //   visibilityTimeout: cdk.Duration.seconds(300)
        // });
    }


}