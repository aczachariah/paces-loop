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

# Parse Reddit results
reddit_results, reddit_summary = parse_sse('/tmp/paces_reddit.json')
print("=== REDDIT RESULTS ===")
if reddit_results:
    print(json.dumps(reddit_results[0], indent=2, ensure_ascii=False)[:5000])
else:
    print("No Reddit results found")
if reddit_summary:
    print("\n=== REDDIT SUMMARY ===")
    print(reddit_summary[:2000])

print("\n\n")

# Parse web results
web_results, web_summary = parse_sse('/tmp/paces_web2.json')
print("=== WEB RESULTS (PACES-specific) ===")
if web_results:
    print(json.dumps(web_results[0], indent=2, ensure_ascii=False)[:5000])
else:
    print("No web results found")
if web_summary:
    print("\n=== WEB SUMMARY ===")
    print(web_summary[:2000])
