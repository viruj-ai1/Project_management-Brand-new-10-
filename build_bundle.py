import os
import base64

def build_standalone_bundle():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dist_dir = os.path.join(base_dir, "frontend", "dist")
    assets_dir = os.path.join(dist_dir, "assets")
    index_path = os.path.join(dist_dir, "index.html")

    if not os.path.exists(index_path):
        print("index.html not found in dist. Run npm run build first.")
        return

    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()

    js_files = [f for f in os.listdir(assets_dir) if f.endswith(".js")]
    css_files = [f for f in os.listdir(assets_dir) if f.endswith(".css")]
    png_files = [f for f in os.listdir(assets_dir) if f.endswith(".png")]

    if css_files:
        css_path = os.path.join(assets_dir, css_files[0])
        with open(css_path, "r", encoding="utf-8") as f:
            css_content = f.read()
        target_css = f'<link rel="stylesheet" crossorigin href="/assets/{css_files[0]}">'
        html = html.replace(target_css, f'<style>\n{css_content}\n</style>')

    if js_files:
        js_path = os.path.join(assets_dir, js_files[0])
        with open(js_path, "r", encoding="utf-8") as f:
            js_content = f.read()

        # Replace any PNG image asset reference with base64 Data URI
        for png_file in png_files:
            png_p = os.path.join(assets_dir, png_file)
            with open(png_p, "rb") as pf:
                b64_str = base64.b64encode(pf.read()).decode("utf-8")
                b64_uri = f"data:image/png;base64,{b64_str}"
                js_content = js_content.replace(f'"/assets/{png_file}"', f'"{b64_uri}"')
                js_content = js_content.replace(f'\"/assets/{png_file}\"', f'\"{b64_uri}\"')
                js_content = js_content.replace(f'/assets/{png_file}', b64_uri)

        # Also replace root Logo.png references if present
        root_logo = os.path.join(base_dir, "Logo.png")
        if os.path.exists(root_logo):
            with open(root_logo, "rb") as rlf:
                rl_b64 = base64.b64encode(rlf.read()).decode("utf-8")
                rl_uri = f"data:image/png;base64,{rl_b64}"
                js_content = js_content.replace('"/Logo.png"', f'"{rl_uri}"')
                js_content = js_content.replace('Logo.png', rl_uri)

        target_js = f'<script type="module" crossorigin src="/assets/{js_files[0]}"></script>'
        html = html.replace(target_js, f'<script type="module">\n{js_content}\n</script>')

    bundle_path = os.path.join(dist_dir, "bundle.html")
    with open(bundle_path, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"Standalone HTML bundle successfully created at: {bundle_path} ({len(html)} bytes)")

if __name__ == "__main__":
    build_standalone_bundle()
