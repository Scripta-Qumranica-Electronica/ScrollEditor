# SQE Frontend Deployment

The SQE Frontend is stored in a Google Cloud Platform bucket called sqe-website.

The bucket was created as explained in this tutorial: Hosting a static website  |  Cloud Storage  |  Google Cloud

## Deploying to staging
Staging is stored in an S3 bucket owned by The Research Software Company. It is accessible from https://sqe.researchsoftwarehosting.org .

To deploy to staging you need to have the AWS CLI installed, and the proper Research Software Company WebDeployer IAM user credentials set up. Then run

```bash
yarn build
cd dist
aws s3 sync . s3://sqe-staging
```

## Deploying to production
Production is served from the GCP bucket `sqe-website`, owned by the SQE project. You need to have the GCloud SDK installed, and configured with a Google account that has access to the GCP SQE Project. Once you have this, open the GCloud SDK shell, and"

```bash
yarn build
cd dist
gsutil -m rsync -r . gs://sqe-website
gcloud compute url-maps invalidate-cdn-cache sqe-website-lb --path "/*"
```

This last command invalidates the CDN cache, so users see the new version. It takes several minutes to complete.
