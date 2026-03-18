"""
questions.py
============
Base de datos del cuestionario de diagnóstico de gestión de carrera (legacy).

Contiene 30 preguntas distribuidas en 5 dimensiones profesionales:
  - Persona      : autoconocimiento de competencias y valores
  - Reputación   : percepción externa y visibilidad profesional
  - Lugar        : conocimiento del entorno y posicionamiento en la industria
  - Posibilidades: exploración de oportunidades y aprendizaje continuo
  - Plan         : planificación, metas y desarrollo estructurado

Cada dimensión contribuye con 6 preguntas (puntaje máximo: 30 por dimensión).
La pregunta 17 tiene puntuación inversa (se aplica la fórmula 6 - valor).
"""
# Question Dictionary and Dimension Mapping

# Mapping of dimensions to Question IDs (Questions are 1-indexed to match typical lists)
DIMENSIONS = {
    "Persona": [1, 2, 3, 26, 27, 29],
    "Reputación": [4, 5, 11, 15, 18, 28],
    "Lugar": [6, 9, 10, 16, 21, 30],
    "Posibilidades": [7, 8, 14, 19, 23, 25],
    "Plan": [12, 13, 17, 20, 22, 24]
}

# Questions dictionary: ID -> Text
QUESTIONS = {
    1: "Puedo nombrar mis competencias, habilidades y logros significativos sin dudar.",
    2: "Puedo distinguir con claridad los tipos de trabajo que más me divierten, así como las tareas a evitar.",
    3: "Puedo describir en qué medida mi trabajo refleja o no mis valores básicos.",
    4: "He discutido recientemente mi fama con mi supervisor o con mis clientes clave.",
    5: "Sé quiénes son mis clientes y cuento con evidencias de que cubro sus necesidades con excelencia.",
    6: "Conozco a los principales competidores de la industria y los ámbitos que los hacen destacar.",
    7: "Puedo describir proyectos o tareas temporales para ampliar habilidades sin cambiar de puesto.",
    8: "Por iniciativa propia he incorporado nuevas oportunidades de aprendizaje en mi trabajo actual.",
    9: "Interactúo de manera regular con gente que me ayuda a conocer nuevas tendencias y oportunidades.",
    10: "Tengo aliados entre mis contactos en la industria.",
    11: "Formo parte activa de asociaciones que me dan notoriedad en mi industria.",
    12: "He establecido mis metas profesionales de manera coherente con las necesidades estratégicas del sector.",
    13: "He identificado mentores para ayudarme a diseñar un plan de acción.",
    14: "En el último año, he aplicado las enseñanzas adquiridas en mis planes formativos.",
    15: "Cuando el equipo o clientes me dan feedback, aplico sus recomendaciones.",
    16: "Puedo nombrar las principales tendencias que afectan a los productos y servicios de mi sector.",
    17: "No he tenido un plan de desarrollo profesional en los últimos dos años.", # Reverse Scored
    18: "Participo en redes sociales profesionales para mantenerme al día.",
    19: "He realizado una autoevaluación de mis carencias de formación y he buscado cómo suplirlas.",
    20: "He actualizado mi CV y perfil profesional en el último año.",
    21: "Conozco las oportunidades de promoción interna en mi empresa.",
    22: "He hablado con personas en puestos que me interesan para entender sus retos.",
    23: "He llevado a cabo entrevistas informativas para explorar otras opciones laborales (teletrabajo, etc.).",
    24: "He establecido metas profesionales que me ofrecen más salidas para el futuro.",
    25: "En el año pasado, he propuesto al menos un nuevo proyecto innovador para mis clientes clave.",
    26: "Estructuro mi trabajo para dedicar la mayor parte de mi tiempo haciendo lo que me gusta.",
    27: "Evalúo las competencias de mi lugar de trabajo y me esfuerzo por aportar lo que falta.",
    28: "Soy conocido entre los principales líderes de mi organización o sector.",
    29: "He establecido metas profesionales alcanzables, según mis habilidades y experiencias.",
    30: "He creado una red de compañeros que me ayuda a prever cambios en la industria."
}

# Identify Reverse Scored Questions
REVERSE_SCORED = [17]
