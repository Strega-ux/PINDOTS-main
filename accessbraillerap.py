import os
import threading
import platform
import webview
import json
import json
import sys
import serial.tools.list_ports
import pypandoc
from pathlib import Path
import speech_recognition as sr
import time

if getattr(sys, "frozen", False):
    try:  # pyi_splash only available while running in pyinstaller
        import pyi_splash
    except ImportError:
        pass

# app options dictionnary with default options
app_options = {
    "comport": "COM1",
    "nbcol": "31",
    "nbline": "24",
    "linespacing": "0",
    "brailletbl": "70",
    "lang": "",
    "theme": "light",
    "offsetx":"1",
    "offsety":"2.5"
}


class SerialStatus:
    Ready = 0
    Busy = 2

rpi = False
COM_TIMEOUT = 5
serial_port = None
serial_status = SerialStatus.Ready
filename = ""
root = None
cancel_print = False

def get_parameter_fname ():
    paramfname = "acces_brap_parameters.json"
    if platform.system() == 'Linux':
        home = Path.home ()
        dir = Path.joinpath(home, ".accessbraillerap/")
        print (home, dir)
        if not os.path.exists(dir):
            os.makedirs(dir)
        fpath = Path.joinpath(dir, paramfname)
        print (fpath)
        return fpath

    else:
        return paramfname
        
    
def load_parameters():
    try:

        fpath = get_parameter_fname()

        with open(fpath, "r", encoding="utf-8") as inf:
            data = json.load(inf)
            for k, v in data.items():
                if k in app_options:
                    app_options[k] = v

    except Exception as e:
        print(e)


class Api:
    def fullscreen(self):
        webview.windows[0].toggle_fullscreen()
        
    def stt_prepare(self):
        import speech_recognition as sr
        self.recognizer = sr.Recognizer()
        self.microphone = sr.Microphone()
        with self.microphone as source:
            print("Backend is initializing...")
            self.recognizer.adjust_for_ambient_noise(source)
            print("Listening... Please speak.")
        return {"status": "listening"}
    
    def stt_listen(self):
        with self.microphone as source:
            try:
                audio = self.recognizer.listen(source, timeout=10, phrase_time_limit=30)
                text = self.recognizer.recognize_google(audio)
                print(f"Transcribed text: {text}")
                return {"success": True, "text": text}
            except Exception as e:
                return {"success": False, "error": str(e)}

    def save_content(self, content):
        filename = webview.windows[0].create_file_dialog(webview.SAVE_DIALOG)
        if not filename:
            return

        with open(filename, "w") as f:
            f.write(content)

    def ls(self):
        return os.listdir(".")

    def remove_comment(self, string):
        """Remove comments from GCode if any"""
        if string.find(";") == -1:
            return string
        return string[: string.index(";")]

    def gcode_get_parameters(self):
        js = json.dumps(app_options)
        return js

    def gcode_set_parameters(self, opt):
        # print ("parameters", opt, type(opt))
        try:
            for k, v in opt.items():
                if k in app_options:
                    app_options[k] = v

        except Exception as e:
            print(e)
        self.save_parameters()

    def save_parameters(self):
        """Save parameters in local json file"""
        try:
            #print ("data", app_options)
            #print ("json", json.dumps(app_options))
            fpath = get_parameter_fname()
            with open(fpath, "w", encoding="utf-8") as of:
                json.dump(app_options, of)

        except Exception as e:
            print(e)

    def saveas_file(self, data, dialogtitle, filterstring):
        global filename

        fname = window.create_file_dialog(
            webview.SAVE_DIALOG,
            allow_multiple=False,
            file_types=(filterstring[0] + " (*.txt)", filterstring[1] + " (*.*)"),
        )

        if fname == "" or fname == None:
            return
        filename = fname

        with open(filename, "w", encoding="utf8") as inf:
            inf.writelines(data)

    def save_file(self, data, dialogtitle, filterstring):
        global filename
        if filename == "":
            fname = window.create_file_dialog(
                webview.SAVE_DIALOG,
                allow_multiple=False,
                file_types=(filterstring[0] + " (*.txt)", filterstring[1] + " (*.*)"),
            )
            if fname == "" or fname == None:
                return
            filename = fname

        with open(filename, "w", encoding="utf8") as inf:
            # print (data)
            inf.writelines(data)

    def load_file(self, dialogtitle, filterstring):
        global filename
        js = {"data": "", "error": ""}

        # check file filter
        if len(filterstring) < 2:
            js["error"] = "incorrect file filter"
            return json.dumps(js)

        # open common dialog
        oldfilter = (("Text files", "*.txt"), ("All files", "*.*"))
        filter = ((filterstring[0], "*.txt"), (filterstring[1], "*.*"))

        listfiles = window.create_file_dialog(
            webview.OPEN_DIALOG,
            allow_multiple=False,
            file_types=(filterstring[0] + " (*.txt)", filterstring[1] + " (*.*)"),
        )

        if listfiles is None:
            return json.dumps(js)
        if len(listfiles) != 1:
            return json.dumps(js)

        fname = listfiles[0]
        if fname == "" or fname == None:
            return json.dumps(js)

        with open(fname, "rt", encoding="utf8") as inf:
            js["data"] = inf.read()
            filename = fname

        return json.dumps(js)

    def import_pandoc(self, dialogtitle, filterstring):
        global filename
        js = {"data": "", "error": ""}

        listfiles = window.create_file_dialog(
            webview.OPEN_DIALOG,
            allow_multiple=False,
            file_types=(filterstring[0] + " (*.*)",),
        )
        if listfiles is None:
            return json.dumps(js)
        if len(listfiles) != 1:
            return json.dumps(js)
        fname = listfiles[0]

        if fname != "":
            filename = ""
            try:
                js["data"] = pypandoc.convert_file(
                    fname,
                    "plain+simple_tables",
                    extra_args=(),
                    encoding="utf-8",
                    outputfile=None,
                )
                # print (data)
            except Exception as e:
                js["error"] = str(e)

        return json.dumps(js)

    def CancelPrint(self):
        global cancel_print
        cancel_print = True
        print ("Printing cenceled")
        return

    def PrintGcode(self, gcode, comport):
        global serial_status, cancel_print
        #print("Opening Serial Port", comport)

        try:
            cancel_print = False
            if serial_status == SerialStatus.Busy:
                print("Printer busy")
                return "Print in progress :"

            serial_status = SerialStatus.Busy
            with serial.Serial(comport, 250000, timeout=2, write_timeout=2) as Printer:
                #print(comport, "is open")

                # Hit enter a few times to wake up
                Printer.write(str.encode("\r\n\r\n"))
                # print(comport, "cleanup")
                time.sleep(1)
                Printer.flushInput()  # Flush startup text in serial input
                # print("Sending GCode")
                gcodelines = gcode.split("\r\n")
                for line in gcodelines:
                    cmd_gcode = self.remove_comment(line)
                    cmd_gcode = (
                        cmd_gcode.strip()
                    )  # Strip all EOL characters for streaming
                    if cmd_gcode.isspace() is False and len(cmd_gcode) > 0:
                        #print("Sending: " + cmd_gcode)
                        Printer.write(
                            cmd_gcode.encode() + str.encode("\n")
                        )  # Send g-code block
                        # Wait for response with carriage return
                        tbegin = time.time()
                        while True:
                            grbl_out = Printer.readline()
                            #print(grbl_out.strip().decode("utf-8"))
                            if str.encode("ok") in grbl_out:
                                break
                            if len(grbl_out) > 0:
                                tbegin = time.time()
                            if time.time() - tbegin > COM_TIMEOUT:
                                raise Exception("Timeout in printer communication")

                    if cancel_print:
                        Printer.write(
                            str.encode("M84;\n") # disable motor
                        )  
                        Printer.readline()
                        break

                #print("End of printing")
                Printer.close()
        except Exception as e:
            print(e)
            serial_status = SerialStatus.Ready
            return "Erreur d'impression :" + str(e)

        serial_status = SerialStatus.Ready
        return " "

    def gcode_set_serial(serial):
        serial_port = serial

    def gcode_set_com_port(self, port):
        app_options["comport"] = str(port)
        self.save_parameters()

    def gcode_set_nb_line(self, nbline):
        app_options["nbline"] = int(nbline)
        self.save_parameters()

    def gcode_set_nb_col(self, nbcol):
        app_options["nbcol"] = int(nbcol)
        json.dump()

    def gcode_get_serial(self):
        data = []
        try:
            ports = serial.tools.list_ports.comports()
            for port in ports:
                # print (port.device)
                # print (port.hwid)
                # print (port.name)
                # print (port.description)
                # print (port.product)
                # print (port.manufacturer)
                data.append(
                    {
                        "device": port.device,
                        "description": port.description,
                        "name": port.name,
                        "product": port.product,
                        "manufacturer": port.manufacturer,
                    }
                )
            print(data)
        except Exception as e:
            print(e)

        # check if com port in parameters is present in port enumeration
        if not any(d.get("device", "???") == app_options["comport"] for d in data):
            print("adding com port in parameters")
            data.append(
                {
                    "device": app_options["comport"],
                    "description": "inconnu",
                    "name": "inconnu",
                    "product": "inconnu",
                    "manufacturer": "inconnu",
                }
            )

        # dump data in json format for frontend
        js = json.dumps(data)

        return js

def get_entrypoint():
    def exists(path):
        print(os.path.join(os.path.dirname(__file__), path))
        return os.path.exists(os.path.join(os.path.dirname(__file__), path))

    if exists("./build/index.html"):  # unfrozen development
        return "./build/index.html"

    # if exists("../Resources/gui/index.html"):  # frozen py2app
    #     return "../Resources/gui/index.html"

    # if exists("./gui/index.html"):
    #     return "./gui/index.html"

    raise Exception("No index.html found")


# def set_interval(interval):
#     def decorator(function):
#         def wrapper(*args, **kwargs):
#             stopped = threading.Event()

#             def loop():  # executed in another thread
#                 while not stopped.wait(interval):  # until stopped
#                     function(*args, **kwargs)

#             t = threading.Thread(target=loop)
#             t.daemon = True  # stop if the program exits
#             t.start()
#             return stopped

#         return wrapper

#     return decorator



def delete_splash():
    print ("delete splash **************************************************")
    
    
    try:
        if (rpi):
            time.sleep(10)
            print ("#################################  resize the window")
            window.resize (512,512)
            window.maximize()
    except:
        pass
        
    try:
        if getattr(sys, "frozen", True):
            pyi_splash.close()
    except:
        pass
    # print ("started", time())


entry = get_entrypoint()

if __name__ == "__main__":
    api = Api()

    debugihm = False

    # print(sys.argv)
    dir, script = os.path.splitext(sys.argv[0])
    if len(sys.argv) > 1 and script == ".py":
        if sys.argv[1] == "--debug":
            debugihm = True

    

    print("start html=", entry)
    load_parameters()
    
    #start gui
    if platform.machine() == 'aarch64':
        rpi = True
    
    if rpi:   
        window = webview.create_window(
            "AccessBrailleRAP", entry, js_api=api, focus=True
        )
    else:
        window = webview.create_window(
            "AccessBrailleRAP", entry, js_api=api, maximized=True, focus=True
        )
 
    # print ("created", time())
    if platform.system() == "Windows":
        print ("starting Windows GUI")
        webview.start(delete_splash, http_server=False, debug=debugihm)
    elif (platform.system() == "Linux"):
        #set QT_QPA_PLATFORM on UBUNTU
        if getattr(sys, 'frozen', False):
            
            if ('QT_QPA_PLATFORM' in os.environ):
                print ("QT_QPA_PLATFORM=", os.environ['QT_QPA_PLATFORM'])
                print ("starting Linux GUI QT with configured QT_QPA_PLATFORM")
                webview.start(delete_splash, gui="qt", http_server=False, debug=debugihm)
            else:
                print ("QT_QPA_PLATFORM=<empty>")
                print ("try to resolve with XDG_SESSION_TYPE")
                plugin = 'xcb'

                if ('XDG_SESSION_TYPE' in os.environ):             
                    if (os.environ['XDG_SESSION_TYPE'] == 'wayland'):
                        plugin = 'wayland'
                    
                # try wayland and xcb to start QT
                print ("setting QT_QPA_PLATFORM to :", plugin)
                os.environ['QT_QPA_PLATFORM'] = plugin
                webview.start(delete_splash, gui="qt", http_server=False, debug=debugihm)                
                
        else :
            print ("starting  GUI QT dev environment")
            webview.start(delete_splash, gui="qt", http_server=False, debug=debugihm)

    
