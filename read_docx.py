import zipfile
import xml.etree.ElementTree as ET

def get_docx_text(path):
    """
    Take the path of a docx file as argument, return the text in html.
    """
    document = zipfile.ZipFile(path)
    xml_content = document.read('word/document.xml')
    document.close()
    tree = ET.fromstring(xml_content)
    
    # Namespaces
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    
    paragraphs = []
    for paragraph in tree.findall('.//w:p', ns):
        texts = [node.text for node in paragraph.findall('.//w:t', ns) if node.text]
        if texts:
            paragraphs.append("".join(texts))
    
    return "\n".join(paragraphs)

if __name__ == "__main__":
    file_path = "Spesifikasi Projek Mata Kuliah.docx"
    try:
        text = get_docx_text(file_path)
        with open("output.txt", "w", encoding="utf-8") as f:
            f.write(text)
        print("Success: Text written to output.txt")
    except Exception as e:
        print(f"Error: {e}")

