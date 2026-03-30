# Recuperacion de Interfaz: Documentos Complementarios

## Resumen ejecutivo

Se detecto que usuarios finales no encontraban la opcion para crear/cargar documentos complementarios desde las vistas ISO, aunque el backend y el flujo de carga en Mapa de Procesos seguian funcionando.

Para eliminar ambiguedad en UX y evitar nuevas perdidas de visibilidad, se agrego una accion explicita en la biblioteca ISO:

- Boton: `Crear documento complementario`
- Ubicacion: cabecera de `DocumentLibrary`
- Destino: ruta `/process-map` (flujo oficial de carga)

## Alcance de la correccion

### Frontend

1. `src/components/DocumentLibrary.jsx`
- Se importo `Link` de `react-router-dom`.
- Se agrego CTA permanente en la cabecera de la biblioteca para enviar al flujo de creacion/carga.

2. `src/components/DocumentLibrary.css`
- Se agregaron estilos de `.document-library__create-btn`.
- Se ajusto comportamiento responsive del header para que el CTA no se pierda en pantallas pequenas.

### No afectado

- API Flask de documentos (`/api/documents`).
- Tipologia de documentos en backend.
- Flujo de carga en modal del mapa de procesos.
- Integraciones ERP y autenticacion.

## Causa raiz

La creacion de documentos complementarios existe en el modal del Mapa de Procesos, pero en vistas ISO la experiencia quedaba solo en modo consulta (biblioteca). Para usuario final, esto se percibia como "desaparecio la interfaz".

Adicionalmente, en despliegues manuales puede ocurrir desalineacion entre codigo fuente y artefacto publicado si no se valida el bundle final en webroot.

## Prevencion de regresion

## Reglas funcionales

1. `DocumentLibrary` debe exponer siempre un acceso visible al flujo de creacion.
2. El flujo de carga oficial para complementarios es `/process-map`.
3. Cualquier refactor de biblioteca ISO debe conservar CTA de creacion.

## Checklist minimo de validacion

1. Abrir `/iso-9001` y `/iso-27001`.
2. Verificar presencia del boton `Crear documento complementario`.
3. Click en boton debe navegar a `/process-map`.
4. Seleccionar proceso y validar que existe card `Documentos Complementarios al Proceso`.
5. Subir archivo de prueba y confirmar visibilidad en biblioteca ISO filtrada por norma.

## Validacion tecnica recomendada

1. Ejecutar build local:

```bash
npm run build
```

2. Verificar que el bundle contiene el texto del CTA:

```bash
grep -Rni "Crear documento complementario" dist/assets/*.js
```

3. En servidor, verificar artefacto publicado:

```bash
grep -Rni "Crear documento complementario" /var/www/webiso/assets/*.js
```

## Flujo de despliegue seguro

1. Hacer backup rapido de archivos afectados.
2. Actualizar solo archivos objetivo del fix.
3. Compilar (`npm run build`).
4. Publicar `dist/` al webroot.
5. Verificar contenido del asset publicado.
6. Ejecutar checklist funcional.

## Plan de rollback rapido

Si se detecta incidencia tras despliegue:

1. Restaurar backups de `DocumentLibrary.jsx` y `DocumentLibrary.css`.
2. Recompilar y republicar `dist/`.
3. Confirmar estado anterior en UI.

## Estado final esperado

- La opcion de crear documentos complementarios es visible desde las vistas ISO.
- El usuario entiende claramente donde crear y donde consultar documentos.
- El comportamiento queda documentado para futuras iteraciones.
