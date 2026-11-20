import test from "node:test";
import assert from "node:assert/strict";
import { textoDaVersao } from "../../src/js/versao.js";

test("textoDaVersao: só aceita X.Y.Z (com sufixo curto) e devolve com o v", () => {
  assert.equal(textoDaVersao("0.4.1"), "v0.4.1");
  assert.equal(textoDaVersao("1.12.3"), "v1.12.3");
  assert.equal(textoDaVersao("0.5.0-rc.1"), "v0.5.0-rc.1");
});

test("textoDaVersao: lixo, marcação e tipos errados viram vazio", () => {
  for (const ruim of ["", "0.4", "<b>1.0.0</b>", "1.0.0<script>", "v0.4.1", null, undefined, 4, {}, "1.0.0 ", "0.4.1\n"]) {
    assert.equal(textoDaVersao(ruim), "", String(ruim));
  }
});
