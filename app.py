from flask import Flask, jsonify, render_template, request
import urllib.request
import xml.etree.ElementTree as ET
import re
import time
import traceback

app = Flask(__name__)

# Simple in-memory cache
cache = {
    'data': None,
    'timestamp': 0
}
CACHE_DURATION = 600  # 10 minutes cache

def parse_release_feed():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    )
    with urllib.request.urlopen(req, timeout=10) as response:
        xml_data = response.read()
    
    root = ET.fromstring(xml_data)
    namespace = {'atom': 'http://www.w3.org/2005/Atom'}
    
    all_updates = []
    
    for entry in root.findall('atom:entry', namespace):
        title = entry.find('atom:title', namespace)
        date_str = title.text.strip() if title is not None else "Unknown Date"
        
        entry_id = entry.find('atom:id', namespace)
        id_str = entry_id.text.strip() if entry_id is not None else ""
        
        updated = entry.find('atom:updated', namespace)
        updated_str = updated.text.strip() if updated is not None else ""
        
        link = entry.find('atom:link[@rel="alternate"]', namespace)
        link_href = link.attrib.get('href', '') if link is not None else ""
        if not link_href:
            link = entry.find('atom:link', namespace)
            link_href = link.attrib.get('href', '') if link is not None else ""
            
        content = entry.find('atom:content', namespace)
        content_html = content.text if content is not None else ""
        
        # Parse the HTML content to extract individual updates
        # The content has <h3>Type</h3> and content details
        parts = re.split(r'<h3>(.*?)</h3>', content_html)
        
        if len(parts) > 1:
            item_idx = 0
            for i in range(1, len(parts), 2):
                update_type = parts[i].strip()
                update_body = parts[i+1].strip() if i+1 < len(parts) else ""
                
                # Extract text version of body for tweeting (strip HTML tags)
                text_content = re.sub(r'<[^>]+>', '', update_body)
                # Replace multiple spaces/newlines
                text_content = re.sub(r'\s+', ' ', text_content).strip()
                
                all_updates.append({
                    'id': f"{id_str}_{item_idx}",
                    'date': date_str,
                    'iso_date': updated_str,
                    'type': update_type,
                    'html': update_body,
                    'text': text_content,
                    'link': link_href
                })
                item_idx += 1
        else:
            # Fallback if no <h3> tags found
            text_content = re.sub(r'<[^>]+>', '', content_html)
            text_content = re.sub(r'\s+', ' ', text_content).strip()
            
            all_updates.append({
                'id': f"{id_str}_0",
                'date': date_str,
                'iso_date': updated_str,
                'type': 'Update',
                'html': content_html,
                'text': text_content,
                'link': link_href
            })
            
    return all_updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('force', 'false').lower() == 'true'
    now = time.time()
    
    if force_refresh or not cache['data'] or (now - cache['timestamp'] > CACHE_DURATION):
        try:
            updates = parse_release_feed()
            cache['data'] = updates
            cache['timestamp'] = now
            return jsonify({
                'status': 'success',
                'source': 'live',
                'timestamp': now,
                'data': updates
            })
        except Exception as e:
            traceback.print_exc()
            # If live fetch fails but we have cached data, return cache with a warning
            if cache['data']:
                return jsonify({
                    'status': 'warning',
                    'message': f'Failed to fetch live updates ({str(e)}). Returning cached data.',
                    'source': 'cache',
                    'timestamp': cache['timestamp'],
                    'data': cache['data']
                })
            else:
                return jsonify({
                    'status': 'error',
                    'message': f'Failed to retrieve release notes: {str(e)}'
                }), 500
    else:
        return jsonify({
            'status': 'success',
            'source': 'cache',
            'timestamp': cache['timestamp'],
            'data': cache['data']
        })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
