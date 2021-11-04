# SQE Frontend Deployment

The SQE Frontend is stored in a Google Cloud Platform bucket called sqe-website.

The bucket was created as explained in this tutorial: Hosting a static website  |  Cloud Storage  |  Google Cloud

GCP Configuration
The data is stored on a GCP bucket called sqe-website, with public read permissions.
Uploading a new version

To upload a new version of the frontend to the bucket, pull the ScrollEditor version you want, and run:

    yarn install
    yarn build

    gsutil rsync -R dist gs://sqe-website (use gsutil -m to do it faster)
    gcloud compute url-maps invalidate-cdn-cache sqe-website-lb --path "/*" (invalidate the cache so people get the update in their browser)

Once you’re done, the new compiled frontend should be available.
