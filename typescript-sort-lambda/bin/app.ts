#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AppStack } from "../src/stack";

/**
 * Creates the CDK app, root construct
 * Calls the AppStack, to create the stack
 * and deploy all the lambdas
 */
const app = new cdk.App();
new AppStack(app, 'SortLambda')
app.synth();