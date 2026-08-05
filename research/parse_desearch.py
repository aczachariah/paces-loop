import json
import sys

# Read the SSE stream and extract the final search results
results = []
current_type = None
current_content = None

with open('/tmp/paces_web.json', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if not line.startswith('data: '):
            continue
        data = line[6:]  # Remove 'data: ' prefix
        try:
            obj = json.loads(data)
            if 'type' in obj and 'content' in obj:
                current_type = obj['type']
                current_content = obj['content']
                if current_type == 'search':
                    results.append(current_content)
                elif current_type == 'completion':
                    # This is the summary
                    pass
        except json.JSONDecodeError:
            pass

# Print the search results
if results:
    print(json.dumps(results[0], indent=2, ensure_ascii=False))
else:
    print("No search results found")
    # Print what we got
    print(f"Types found: {current_type}")
    print(f"Content preview: {str(current_content)[:500] if current_content else 'None'}")
