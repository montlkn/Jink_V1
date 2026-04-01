import urllib.request
import json
import ssl
import sys

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://a860-collectionguides.nyc.gov/repositories/2/search?q=Block+1+Lot+10&op%5B%5D=&field%5B%5D=&from_year%5B%5D=&to_year%5B%5D=&limit=collection%2Carchival_object&format=json&page=1"

req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req, context=ctx) as response:
        print(response.read().decode('utf-8')[:1500])
except Exception as e:
    print(f"Error: {e}")
