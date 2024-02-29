+++
title = "Deploying Next.js on Google App Engine"
date = "2020-09-10"
+++

Google offers many cloud services and one of their best is App Engine. App Engine compliments Next.js and makes building out your application much easier.

### Getting started

Create a starter Next.js app:

```bash
$ npx create-next-app app-engine-sample --use-npm
$ cd app-engine-sample
```

### Install the Google Cloud SDK

You can follow the [official guide](https://cloud.google.com/sdk/docs/install).

Run the `init` command to login and set up, [more information here](https://cloud.google.com/sdk/docs/initializing).

```bash
$ gcloud init
```

### Pre-deploy set up

Open `package.json` and update your scripts key:

```json
"scripts": {
  "dev": "next dev",
  "build": "NODE_ENV=production next build",
  "predeploy": "npm run build",
  "deploy": "gcloud app deploy --quiet",
  "start": "PORT=${PORT:-3000}; next start -p $PORT"
},
```

In your project root directory create a file named `app.yaml` with the following contents:

```yaml
# Choose the Node.js version you require
runtime: nodejs14

# Server instance type `F1` is the smallest
instance_class: F1

# Set environment variables
env_variables:
  NODE_ENV: production

# Handlers are like routes for the Load Balancer
handlers:
# Redirect to https always
- url: /.*
  secure: always
  redirect_http_response_code: 301
  script: auto

# Serve the public directory as static files
- url: /.*
  static_dir: public

# Upload and serve Next.js compiled static resources
- url: /_next/static/(.*)$
  static_files: .next/static/\1
  upload: .next/static/.*$
```

The `app.yaml` file configures the type of server your app will need and various other settings

Create another file named `.gcloudignore` with the following contents:

```bash
.git
.gitignore
.eslintrc.js
.eslintignore
**/*.md
**/*.sh
/node_modules
/.npm
```

This file tells the `gcloud app deploy` command which files it should ignore and not upload.

### Create the App Engine Instance

To create our app instance, run this command from your terminal:

```bash
$ gcloud app create --region=us-central
```

### Deploy

Run `npm run deploy` command from your terminal, you should see the app running a build and then deploying.

### Wrapping up

To view your app you can run:
```bash
$ gcloud app browse
```
