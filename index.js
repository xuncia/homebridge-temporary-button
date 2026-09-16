const { exec } = require("child_process");

let Service, Characteristic;

module.exports = (api) => {
    Service = api.hap.Service;
    Characteristic = api.hap.Characteristic;
    api.registerAccessory("TemporaryButton", TemporaryButton);
};

class TemporaryButton {
    constructor(log, config, api) {
        this.log = log;
        this.name = config.name;
        // Comando/script da eseguire
        this.onCommand = config.onCommand || "/var/lib/homebridge/cancelletto.sh";
        this.duration = config.duration || 1500;

        this.service = new Service.LockMechanism(this.name);

        this.service
            .getCharacteristic(Characteristic.LockTargetState)
            .on("set", this.handleLockTargetStateSet.bind(this));

        // Stato iniziale: CHIUSO (SECURED)
        this.service.updateCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.SECURED);
        this.service.updateCharacteristic(Characteristic.LockTargetState, Characteristic.LockTargetState.SECURED);
    }

    handleLockTargetStateSet(value, callback) {
        // 1. Rilascia subito la callback a HomeKit
        callback(null);

        if (value === Characteristic.LockTargetState.UNSECURED) {
            this.log(`Invocazione comando: ${this.onCommand}`);

            // 2. Stato visivo: aperto (qui scatta la notifica nativa, se abilitata)
            this.service.updateCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.UNSECURED);

            // 3. Esegue lo script/comando tramite bash
            exec(this.onCommand, { shell: '/bin/bash' }, (error, stdout, stderr) => {
                if (error) {
                    this.log(`ERRORE ESECUZIONE SCRIPT: ${error.message}`);
                    return;
                }
                if (stderr) {
                    this.log(`STDERR SCRIPT: ${stderr}`);
                }
                if (stdout) {
                    this.log(`STDOUT SCRIPT: ${stdout.trim()}`);
                }
            });

            // 4. Ripristina stato su "Chiuso" (comportamento a impulso)
            setTimeout(() => {
                this.log("Ripristino stato cancello a Chiuso");
                this.service.updateCharacteristic(Characteristic.LockTargetState, Characteristic.LockTargetState.SECURED);
                this.service.updateCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.SECURED);
            }, this.duration);
        }
    }

    getServices() {
        return [this.service];
    }
}
