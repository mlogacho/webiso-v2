# Guía de Contribución — WebISO v2

> DataCom S.A. | Autor: Marco Logacho | Actualizado: marzo 2026

---

## Convenciones de Commit

Este proyecto sigue el estándar **Conventional Commits**.
Formato: `<tipo>(<alcance opcional>): <descripción en imperativo>`

### Tipos permitidos

| Tipo       | Cuándo usarlo                                                        |
|------------|----------------------------------------------------------------------|
| `feat`     | Nueva funcionalidad visible para el usuario                          |
| `fix`      | Corrección de un error o comportamiento incorrecto                   |
| `docs`     | Cambios exclusivamente en documentación                              |
| `refactor` | Cambio interno sin impacto en la funcionalidad ni en tests           |
| `test`     | Adición o corrección de pruebas automatizadas                        |
| `chore`    | Mantenimiento: dependencias, CI/CD, configuración, archivos de repo  |
| `security` | Mejoras relacionadas con seguridad o controles ISO 27001             |
| `perf`     | Mejoras de rendimiento sin cambio funcional                          |
| `style`    | Cambios de formato, espaciado, estilo visual (no lógica)             |

---

### Ejemplos de mensajes correctos ✅

```
feat(documentos): agrega tipo Documentos Complementarios al Proceso
fix(api): corrige validación de extensiones en subida de archivos
docs(architecture): agrega diagrama de módulos y modelo de datos
refactor(processMap): simplifica lógica de apertura de modal
test(api): agrega pruebas para endpoint DELETE /api/documents
chore: actualiza dependencias Node a versiones LTS
security(auth): valida token SSO antes de abrir app ERP
feat(erp): agrega integración con sistema de Acta de Reuniones
fix(ui): corrige alineación del resumen documental en modal
```

### Ejemplos de mensajes incorrectos ❌

```
"arreglos varios"               → no describe qué se arregló
"WIP"                           → no describe el cambio
"fix bug"                       → demasiado vago
"Update README.md"              → no usa el formato convencional
"cambios en el frontend"        → sin tipo ni verbo en imperativo
"refactorizado el componente"   → el verbo debe ir en imperativo
```

---

## Reglas de estilo en el código

### Python (`app.py`, `services/`)
- Docstrings en **inglés**, formato PEP 257 (triple comillas `"""`)
- Variables y funciones en `snake_case`
- Constantes en `UPPER_SNAKE_CASE`
- Máximo 100 caracteres por línea

### JavaScript / React (`src/`)
- Comentarios descriptivos en **español**
- Componentes en `PascalCase`
- Funciones y variables en `camelCase`
- Constantes globales en `UPPER_SNAKE_CASE`
- Hooks personalizados con prefijo `use`

### Estilos CSS
- Clases siguiendo la metodología **BEM**: `bloque__elemento--modificador`
- Un archivo CSS por componente, en la misma carpeta

---

## Flujo de trabajo recomendado

```bash
# 1. Crear rama desde main
git checkout -b feat/nombre-de-la-funcionalidad

# 2. Desarrollar y hacer commits atómicos
git add <archivos>
git commit -m "feat(módulo): descripción concisa del cambio"

# 3. Actualizar la rama con main antes de mergear
git fetch origin
git rebase origin/main

# 4. Push y Pull Request
git push origin feat/nombre-de-la-funcionalidad
```

---

## Checklist antes de hacer commit

- [ ] El código compila sin errores (`npm run build` / `python app.py`)
- [ ] Los estilos no rompen el layout en la vista del mapa de procesos
- [ ] Las llamadas a la API incluyen manejo de errores
- [ ] No se incluyen credenciales, tokens ni IPs privadas en el código
- [ ] El mensaje de commit sigue las convenciones definidas arriba
- [ ] `uploads/`, `uploads.db`, `.env` están en `.gitignore` y no en el commit

---

## Contacto

**Marco Logacho** — Director de Desarrollo Digital e IA, DataCom S.A.
