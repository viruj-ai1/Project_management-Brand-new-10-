import json
import os
import asyncio
import aiofiles

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')

async def read_data(filename: str):
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        return []
    try:
        async with aiofiles.open(filepath, mode='r') as f:
            content = await f.read()
            return json.loads(content)
    except Exception as e:
        print(f"Error reading {filename}: {e}")
        return []

async def write_data(filename: str, data):
    filepath = os.path.join(DATA_DIR, filename)
    try:
        async with aiofiles.open(filepath, mode='w') as f:
            await f.write(json.dumps(data, indent=2))
    except Exception as e:
        print(f"Error writing {filename}: {e}")
