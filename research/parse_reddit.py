import json

def parse_sse(filepath):
    results = []
    summary = None
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line.startswith('data: '):
                continue
            data = line[6:]
            try:
                obj = json.loads(data)
                if 'type' in obj and 'content' in obj:
                    if obj['type'] == 'search':
                        results.append(obj['content'])
                    elif obj['type'] == 'completion':
                        summary = obj['content']
            except json.JSONDecodeError:
                pass
    return results, summary

files = {
    'painpoints': '/tmp/paces_painpoints.json',
    'best': '/tmp/paces_best.json',
    'failed': '/tmp/paces_failed.json'
}

for name, path in files.items():
    results, summary = parse_sse(path)
    print(f'\n{"="*60}')
    print(f'=== {name.upper()} ===')
    print(f'{"="*60}')
    if results:
        for i, item in enumerate(results[0].get('results', results[0]) if isinstance(results[0], dict) else results[0][:5] if isinstance(results[0], list) else []):
            if isinstance(item, dict):
                title = item.get('title', 'N/A')
                link = item.get('link', 'N/A')
                snippet = item.get('snippet', '')[:300]
                print(f'\n--- [{i+1}] {title} ---')
                print(f'Link: {link}')
                print(f'Snippet: {snippet}')
    else:
        print('No results found')
    if summary:
        print(f'\n--- SUMMARY ---')
        print(summary[:1000])
