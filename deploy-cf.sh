#!/bin/bash

# Deployment script for Cloudflare Pages

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null
then
    echo "wrangler could not be found. Installing..."
    npm install -g wrangler
fi

echo "Deploying to Cloudflare Pages..."
wrangler pages deploy . --project-name algorithms-course
