from fpdf import FPDF
from services import charts
import os
import tempfile

class PDFReport(FPDF):
    def header(self):
        self.set_font('Helvetica', 'B', 15)
        self.cell(0, 10, 'Informe de Gestión de Carrera', 0, 1, 'C')
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.cell(0, 10, f'Página {self.page_no()}', 0, 0, 'C')

def generate_pdf(user_data, scores):
    """
    Generates a PDF report.
    user_data: dict {name, email}
    scores: dict {Dimension: Score}
    Returns: path to generated PDF file
    """
    pdf = PDFReport()
    pdf.add_page()
    pdf.set_font("Helvetica", size=12)
    
    # User Info
    pdf.set_font("Helvetica", 'B', 12)
    pdf.cell(0, 10, f"Participante: {user_data.get('name', 'N/A')}", 0, 1)
    pdf.cell(0, 10, f"Email: {user_data.get('email', 'N/A')}", 0, 1)
    pdf.ln(10)
    
    # Scores Table
    pdf.set_font("Helvetica", 'B', 14)
    pdf.cell(0, 10, "Resultados por Dimensión", 0, 1)
    pdf.set_font("Helvetica", size=12)
    
    for dim, score in scores.items():
        pdf.cell(50, 10, f"{dim}:", 0, 0)
        pdf.cell(0, 10, f"{score} / 30", 0, 1)
        
    pdf.ln(10)
    
    # Generate and Save Charts Temporarily
    # Create Radar Chart
    fig_radar = charts.create_radar_chart(scores)
    
    # Create Bar Chart
    fig_bar = charts.create_bar_chart(scores)
    
    # Save to temp files
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_radar:
        fig_radar.savefig(tmp_radar.name, format='png', bbox_inches='tight')
        radar_path = tmp_radar.name
        
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_bar:
        fig_bar.savefig(tmp_bar.name, format='png', bbox_inches='tight')
        bar_path = tmp_bar.name
        
    # Add Charts to PDF
    # Close figures to avoid memory leaks if not closed by savefig logic (plt interface)
    # charts.py helper closes them usually if using get_base64, but here we access fig directly.
    # We should close them after saving.
    
    pdf.image(radar_path, x=10, w=100)
    pdf.ln(5)
    pdf.image(bar_path, x=10, w=150)
    
    # Cleanup temp files
    try:
        os.remove(radar_path)
        os.remove(bar_path)
    except:
        pass
        
    # Save PDF
    # In Flask, we might want to save to a static/temp folder or return bytes.
    # For now, let's save to a specific 'outputs' folder or temp.
    # To keep it simple, we return the absolute path.
    output_filename = f"report_{user_data.get('name', 'user').replace(' ', '_')}.pdf"
    
    # Ideally save to a temp dir
    temp_dir = tempfile.gettempdir()
    full_path = os.path.join(temp_dir, output_filename)
    
    pdf.output(full_path)
    
    return full_path
