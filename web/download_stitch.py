import urllib.request
import certifi
import ssl

url = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2YxYzAzMzJhZDY3NzRiYzY5ZjMwNzY0ODY5MGRlNTIwEgsSBxDSsc2gthkYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjQwOTcxMTQ3NDAzMDMwMTc5MQ&filename=&opi=89354086"
req = urllib.request.Request(
    url, 
    headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'}
)

context = ssl.create_default_context(cafile=certifi.where())

try:
    with urllib.request.urlopen(req, timeout=15, context=context) as response:
        with open('stitch_login.html', 'wb') as f:
            f.write(response.read())
    print("Download successful")
except Exception as e:
    print(f"Download failed: {e}")
