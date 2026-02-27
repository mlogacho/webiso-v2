from flask import Flask, render_template, request, redirect, url_for, session, send_file, flash
import questions
from services import charts, report_generator, email_service
import os

app = Flask(__name__)
app.secret_key = 'supersecretkey' # Change this for production

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/start', methods=['POST'])
def start_survey():
    session['user_name'] = request.form.get('name')
    session['user_email'] = request.form.get('email')
    return redirect(url_for('survey'))

@app.route('/survey')
def survey():
    if 'user_name' not in session:
        return redirect(url_for('index'))
    
    # Sort questions by ID
    sorted_questions = dict(sorted(questions.QUESTIONS.items()))
    return render_template('survey.html', questions=sorted_questions)

@app.route('/submit', methods=['POST'])
def submit_survey():
    if 'user_name' not in session:
        return redirect(url_for('index'))
        
    answers = {}
    for key, value in request.form.items():
        if key.isdigit():
            answers[int(key)] = int(value)
            
    # Calculate Scores
    scores = {}
    for dimension, q_ids in questions.DIMENSIONS.items():
        dim_score = 0
        for q_id in q_ids:
            score = answers.get(q_id, 0)
            if q_id in questions.REVERSE_SCORED:
                score = 6 - score
            dim_score += score
        scores[dimension] = dim_score
        
    session['scores'] = scores
    return redirect(url_for('results'))

@app.route('/results')
def results():
    if 'scores' not in session or 'user_name' not in session:
        return redirect(url_for('index'))
        
    scores = session['scores']
    
    # Generate charts for web display
    fig_radar = charts.create_radar_chart(scores)
    radar_b64 = charts.get_base64_chart(fig_radar)
    
    fig_bar = charts.create_bar_chart(scores)
    bar_b64 = charts.get_base64_chart(fig_bar)
    
    return render_template('results.html', 
                           name=session['user_name'], 
                           scores=scores, 
                           radar_chart=radar_b64, 
                           bar_chart=bar_b64)

@app.route('/download_pdf')
def download_pdf():
    if 'scores' not in session or 'user_name' not in session:
        return redirect(url_for('index'))
        
    user_data = {"name": session['user_name'], "email": session['user_email']}
    scores = session['scores']
    
    pdf_path = report_generator.generate_pdf(user_data, scores)
    
    return send_file(pdf_path, as_attachment=True, download_name="Reporte_Gestion_Carrera.pdf")

@app.route('/send_email')
def send_email_route():
    if 'scores' not in session or 'user_name' not in session:
        return redirect(url_for('index'))
        
    user_data = {"name": session['user_name'], "email": session['user_email']}
    scores = session['scores']
    
    pdf_path = report_generator.generate_pdf(user_data, scores)
    
    subject = f"Tu Reporte de Gestión de Carrera - {user_data['name']}"
    body = f"Hola {user_data['name']},\n\nAdjunto encontrarás tu reporte de evaluación de dimensiones profesionales.\n\nSaludos,\nEquipo de Gestión de Carrera"
    
    success, result = email_service.send_email(user_data['email'], subject, body, pdf_path)
    
    # Simple feedback approach (Flash isn't set up in template, so we return a string or simple page for now)
    # Ideally should use flash messages.
    if success:
        return "<h1>Correo enviado exitosamente!</h1><a href='/results'>Volver</a>"
    else:
        return f"<h1>Error al enviar correo: {result}</h1><a href='/results'>Volver</a>"

if __name__ == '__main__':
    app.run(debug=True, port=5000)
