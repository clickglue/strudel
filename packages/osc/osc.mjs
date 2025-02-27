/*
osc.mjs - <short description TODO>
Copyright (C) 2022 Strudel contributors - see <https://github.com/tidalcycles/strudel/blob/main/packages/osc/osc.mjs>
This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details. You should have received a copy of the GNU Affero General Public License along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import OSC from 'osc-js';
import { logger, parseNumeral, Pattern } from '@strudel.cycles/core';

let connection; // Promise<OSC>
function connect() {
  if (!connection) {
    // make sure this runs only once
    connection = new Promise((resolve, reject) => {
      const osc = new OSC();
      osc.open();
      osc.on('open', () => {
        const url = osc.options?.plugin?.socket?.url;
        logger(`[osc] connected${url ? ` to ${url}` : ''}`);
        resolve(osc);
      });
      osc.on('close', () => {
        connection = undefined; // allows new connection afterwards
        console.log('[osc] disconnected');
        reject('OSC connection closed');
      });
      osc.on('error', (err) => reject(err));
    }).catch((err) => {
      connection = undefined;
      throw new Error('Could not connect to OSC server. Is it running?');
    });
  }
  return connection;
}

const latency = 0.1;
let startedAt = -1;

/**
 *
 * Sends each hap as an OSC message, which can be picked up by SuperCollider or any other OSC-enabled software.
 *
 * @name osc
 * @memberof Pattern
 * @returns Pattern
 */
Pattern.prototype.osc = async function () {
  const osc = await connect();
  return this.onTrigger((time, hap, currentTime, cps = 1) => {
    const cycle = hap.wholeOrPart().begin.valueOf();
    const delta = hap.duration.valueOf();
    // time should be audio time of onset
    // currentTime should be current time of audio context (slightly before time)
    if (startedAt < 0) {
      startedAt = Date.now() - currentTime * 1000;
    }
    const controls = Object.assign({}, { cps, cycle, delta }, hap.value);
    // make sure n and note are numbers
    controls.n && (controls.n = parseNumeral(controls.n));
    controls.note && (controls.note = parseNumeral(controls.note));
    const keyvals = Object.entries(controls).flat();
    const ts = Math.floor(startedAt + (time + latency) * 1000);
    const message = new OSC.Message('/dirt/play', ...keyvals);
    const bundle = new OSC.Bundle([message], ts);
    bundle.timestamp(ts); // workaround for https://github.com/adzialocha/osc-js/issues/60
    osc.send(bundle);
  });
};
