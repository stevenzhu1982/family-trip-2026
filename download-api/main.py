"""
Video Downloader API
基于 yt-dlp 的视频下载服务
"""
import os
import re
import json
import tempfile
import subprocess
from pathlib import Path
from urllib.parse import unquote

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
import yt_dlp

app = FastAPI(title="Video Downloader API", version="1.0")

# CORS — allow frontend from anywhere
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024  # 2 GB safety limit

# ============================================================
# Helper: sanitize filename — keep Chinese, letters, numbers
# ============================================================
def safe_filename(title: str) -> str:
    """Remove or replace characters that are problematic in filenames."""
    name = re.sub(r'[<>:"/\\|?*]', '', title)
    name = re.sub(r'\s+', ' ', name).strip()
    return name or 'video'


# ============================================================
# POST /api/info — extract video metadata
# ============================================================
class InfoRequest:
    def __init__(self, url: str):
        self.url = url

@app.post("/api/info")
async def get_info(request: Request):
    body = await request.json()
    url = (body.get('url') or '').strip()
    if not url:
        raise HTTPException(400, detail='请提供视频链接')

    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except Exception as e:
        raise HTTPException(400, detail=f'获取视频信息失败: {str(e)[:200]}')

    if not info:
        raise HTTPException(400, detail='无法获取视频信息')

    # Normalize formats
    formats = []
    seen = set()
    for f in (info.get('formats') or []):
        # Deduplicate by format_id
        fid = f.get('format_id', '')
        if fid in seen:
            continue
        seen.add(fid)

        # Get resolution
        height = f.get('height') or 0
        width = f.get('width') or 0
        vcodec = f.get('vcodec', 'none')
        acodec = f.get('acodec', 'none')

        formats.append({
            'format_id': fid,
            'ext': f.get('ext', ''),
            'width': width,
            'height': height,
            'tbr': f.get('tbr') or 0,
            'filesize': f.get('filesize') or f.get('filesize_approx') or 0,
            'vcodec': vcodec if vcodec != 'none' else '',
            'acodec': acodec if acodec != 'none' else '',
            'fps': f.get('fps') or 0,
            'format_note': f.get('format_note') or '',
        })

    result = {
        'success': True,
        'video': {
            'title': info.get('title', ''),
            'channel': info.get('channel') or info.get('uploader') or info.get('creator') or '',
            'duration': info.get('duration') or 0,
            'thumbnail': info.get('thumbnail') or '',
            'webpage_url': info.get('webpage_url') or url,
            'formats': formats,
        }
    }

    return JSONResponse(result)


# ============================================================
# GET /api/download — stream video download
# ============================================================
@app.get("/api/download")
async def download_video(
    url: str = Query(..., description='视频链接'),
    format: str = Query('bestvideo+bestaudio/best', description='yt-dlp format selector'),
):
    if not url:
        raise HTTPException(400, detail='请提供视频链接')

    # First, get the title for the filename
    try:
        with yt_dlp.YoutubeDL({'quiet': True, 'no_warnings': True}) as ydl:
            info = ydl.extract_info(url, download=False)
            title = info.get('title', 'video')
            ext = info.get('ext', 'mp4')
    except Exception:
        title = 'video'
        ext = 'mp4'

    safe = safe_filename(title)
    filename = f"{safe}.{ext}"

    # Determine content type
    content_type_map = {
        'mp4': 'video/mp4', 'webm': 'video/webm', 'mkv': 'video/x-matroska',
        'm4a': 'audio/mp4', 'mp3': 'audio/mpeg', 'aac': 'audio/aac',
        'wav': 'audio/wav', 'flac': 'audio/flac', 'opus': 'audio/ogg',
    }
    media_type = content_type_map.get(ext, 'video/mp4')

    # Stream function — pipes yt-dlp stdout directly to the client
    def stream_ytdlp():
        cmd = [
            'yt-dlp',
            '-f', format,
            '-o', '-',              # output to stdout
            '--no-playlist',
            '--quiet',
            '--no-warnings',
            url,
        ]
        try:
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            total_sent = 0
            while True:
                chunk = proc.stdout.read(64 * 1024)  # 64KB chunks
                if not chunk:
                    break
                total_sent += len(chunk)
                if total_sent > MAX_FILE_SIZE:
                    proc.kill()
                    yield '{"error":"文件过大，超过2GB限制"}'.encode('utf-8')
                    return
                yield chunk
            proc.wait()
            if proc.returncode != 0:
                stderr = proc.stderr.read().decode('utf-8', errors='replace')[:200]
                # Don't send error after successful partial download
                import sys
                print(f"yt-dlp error: {stderr}", file=sys.stderr)
        except Exception as e:
            import sys
            print(f"Stream error: {e}", file=sys.stderr)
            yield f'{{"error":"{str(e)}"}}'.encode()

    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"; filename*=UTF-8\'\'{filename}',
        'Accept-Ranges': 'bytes',
    }

    return StreamingResponse(
        stream_ytdlp(),
        media_type=media_type,
        headers=headers,
    )


# ============================================================
# Health check
# ============================================================
@app.get("/")
@app.get("/health")
async def health():
    return {"status": "ok", "service": "video-downloader"}


# ============================================================
# Run with: uvicorn main:app --host 0.0.0.0 --port 8000
# ============================================================
if __name__ == '__main__':
    import uvicorn
    port = int(os.environ.get('PORT', 8000))
    uvicorn.run('main:app', host='0.0.0.0', port=port, reload=False)
