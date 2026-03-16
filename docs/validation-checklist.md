# Validation Checklist

## Validacion post-despliegue

1. `http://10.11.121.58:8081` responde con WebISO.
2. El header muestra correctamente el logo DataCom.
3. `http://10.11.121.58:8081/erp-datacom` carga sin errores.
4. El login ERP autentica con credenciales CRM.
5. El flujo 2FA funciona para usuarios con y sin configuracion previa.
6. CRM abre desde ERP sin volver a pedir login.
7. Los permisos por aplicacion ERP se respetan.
8. `http://10.11.121.58:8081/erp-admin` solo es visible para roles autorizados.
9. Nginx valida con `nginx -t`.
10. Los archivos de `dist/` coinciden con el ultimo build esperado.

## Validacion post-restauracion

1. Se pudo clonar el repositorio.
2. El archivo `.env` fue restaurado.
3. El deploy fue ejecutado sin errores fatales.
4. Los respaldos de datos restauraron integridad.
5. Las URLs internas y DNS corporativo resuelven correctamente.
