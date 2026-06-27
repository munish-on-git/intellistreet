<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/8c29904b-87b0-49e2-822a-84dc0a31dbc1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key and mappls api key 'NEXT_PUBLIC_MAPPLS_API_KEY'
3. Run the app:
   `npm run dev`

**Prerequisites:**  Python

1. cd backend_python

2. python -m venv venv then source venv/bin/activate 

3. pip install -r requirements.txt

4. uvicorn main:app --host 127.0.0.1 --port 8000 --reload

