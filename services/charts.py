"""
services/charts.py
==================
Generación de gráficas para el módulo de cuestionario de diagnóstico (legacy).

Provee dos tipos de visualización de los resultados por dimensión profesional:
  - Gráfica radar (spider chart) para mostrar el perfil multidimensional.
  - Gráfica de barras horizontales para comparar puntajes por dimensión.

Usa matplotlib con backend 'Agg' (sin GUI) para compatibilidad con entornos de servidor.
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import io
import base64

def create_radar_chart(scores):
    """
    Creates a radar chart for the 5 dimensions.
    Returns: matplotlib figure
    """
    if not scores:
         return None
         
    # Categories (Dimensions)
    categories = list(scores.keys())
    values = list(scores.values())
    
    # Number of variables
    N = len(categories)
    
    # What will be the angle of each axis in the plot?
    angles = [n / float(N) * 2 * np.pi for n in range(N)]
    angles += angles[:1] # Close the loop
    
    # Initialise the spider plot
    fig, ax = plt.subplots(figsize=(6, 6), subplot_kw=dict(polar=True))
    
    # Draw one axe per variable + add labels
    plt.xticks(angles[:-1], categories)
    
    # Draw ylabels
    ax.set_rlabel_position(0)
    plt.yticks([10, 20, 30], ["10", "20", "30"], color="grey", size=7)
    plt.ylim(0, 30)
    
    # Plot data
    values += values[:1] # Close the loop
    ax.plot(angles, values, linewidth=1, linestyle='solid')
    
    # Fill area
    ax.fill(angles, values, 'b', alpha=0.1)
    
    return fig

def create_bar_chart(scores):
    """
    Creates a horizontal bar chart.
    Returns: matplotlib figure
    """
    if not scores:
        return None
        
    categories = list(scores.keys())
    values = list(scores.values())
    
    fig, ax = plt.subplots(figsize=(8, 4))
    
    colors = ['#6A1B9A'] * len(categories) # Deep Purple
    
    bars = ax.barh(categories, values, color=colors)
    
    ax.set_xlim(0, 30)
    ax.set_xlabel('Puntuación')
    ax.set_title('Resultados por Dimensión')
    
    ax.bar_label(bars, padding=3, color='white', fontweight='bold', label_type='edge')
    
    return fig

def get_base64_chart(fig):
    """
    Converts a matplotlib figure to a base64 string for HTML embedding.
    """
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight')
    buf.seek(0)
    img_str = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig) # Close to free memory
    return img_str
