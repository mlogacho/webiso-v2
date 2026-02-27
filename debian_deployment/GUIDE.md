# Guía de Despliegue: Acceso como "http://datacom.intranet.iso"

Esta guía detalla cómo copiar el proyecto al servidor y configurar el acceso mediante el nombre `datacom.intranet.iso` (o `intranetiso900127001`).

## 1. Copiar y Actualizar Servidor
Para que el servidor acepte estos nombres, debes actualizar la configuración:

```bash
# 1. Copia los archivos desde tu Mac
scp -r debian_deployment usuario@10.11.121.58:~/webiso

# 2. Conéctate y ejecuta el script
ssh usuario@10.11.121.58
cd ~/webiso
chmod +x debian_deployment/setup.sh
sudo ./debian_deployment/setup.sh
```

## 2. SOLUCIÓN AL ERROR "SERVIDOR NO ENCONTRADO"
Si ves el error **"Uf. Tenemos problemas para encontrar ese sitio"**, significa que **tu computadora no sabe la dirección IP** del nombre que escribiste. El servidor está listo, pero tu PC no sabe cómo llegar.

Tienes 2 opciones para arreglarlo:

### Opción A (Recomendada): Pedir al Dpto. de Sistemas
Diles: *"Por favor, agreguen en el DNS de la empresa que el dominio `datacom.intranet.iso` apunte a la IP `10.11.121.58`"*

### Opción B (Inmediata): Configurar tu propia PC (Archivo Hosts)
Esto hará que funcione **solo en tu computadora**.

**En Windows:**
1.  Busca "Bloc de notas", clic derecho -> **Ejecutar como administrador**.
2.  Abre: `C:\Windows\System32\drivers\etc\hosts` (El archivo no tiene extensión .txt).
3.  Agrega al final:
    ```
    10.11.121.58 datacom.intranet.iso
    ```
4.  Guarda.

**En Mac/Linux:**
1.  Terminal: `sudo nano /etc/hosts`
2.  Agrega:
    ```
    10.11.121.58 datacom.intranet.iso
    ```
3.  Guarda (`Ctrl+O`, `Enter`, `Ctrl+X`).

Intenta ahora entrar a: **http://datacom.intranet.iso**
