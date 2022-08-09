// import * as cdk from 'aws-cdk-lib';
// import { Template } from 'aws-cdk-lib/assertions';
// import * as Tmp from '../lib/tmp-stack';

// example test. To run these tests, uncomment this file along with the
// example resource in lib/tmp-stack.ts
import {EventModel} from "../src/model";
import assert = require("assert");

test('SQS Queue Created', () => {
//   const app = new cdk.App();
//     // WHEN
//   const stack = new Tmp.TmpStack(app, 'MyTestStack');
//     // THEN
//   const template = Template.fromStack(stack);

//   template.hasResourceProperties('AWS::SQS::Queue', {
//     VisibilityTimeout: 300
//   });
});

test('Read Event Data', () => {
   var jsonString =  `{
      "description": "Same length integer List",
      "count": 2,
      "type": "constant",
      "sort":"bubble",
      "lines":
      [{
        "id": "line1",
        "data": [1242,85522,412,3988,1,28,856]
        },{
          "id": "line2",
          "data": [52,98,2147,5,6]
      }]
    }`
   var event = new EventModel();
   Object.assign(event, JSON.parse(jsonString));
   assert.equal(event.count, 2, "Count is incorrect");
   // @ts-ignore
    const exp = event.lines.at(0) === undefined ? assert.fail("Data at line 1 not defined") : event.lines.at(0).data;
    const t =  arrayEquals(exp,[1242,85522,412,3988,1,28,856]);
    assert.equal( t, true, "List incorrect at line 1")

});

function arrayEquals(a : number[], b : number[]): boolean {
    return Array.isArray(a) &&
        Array.isArray(b) &&
        a.length === b.length &&
        a.every((val, index) => val === b[index]);
}
