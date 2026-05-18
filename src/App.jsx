function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var params = e.parameter;
    
    // ──── DUPLIKAT-CHECK (gleiche E-Mail oder Telefon in letzten 24h) ────
    var now = new Date();
    var emailParam = (params.email || '').trim().toLowerCase();
    var telParam = (params.telefon || '').replace(/\s/g, '');
    
    if (emailParam || telParam) {
      var data = sheet.getDataRange().getValues();
      for (var i = data.length - 1; i >= 1; i--) {
        var rowDate = new Date(data[i][0]); // Spalte A = Datum
        var diffHours = (now - rowDate) / (1000 * 60 * 60);
        if (diffHours > 24) break; // Nur letzte 24h prüfen
        
        var rowEmail = (data[i][2] || '').toString().trim().toLowerCase(); // Spalte C
        var rowTel = (data[i][3] || '').toString().replace(/\s/g, '');     // Spalte D
        
        if ((emailParam && rowEmail === emailParam) || (telParam && telParam.length > 5 && rowTel === telParam)) {
          Logger.log("Duplikat erkannt: " + emailParam + " / " + telParam);
          return ContentService.createTextOutput("OK"); // Stilles OK — User sieht Ergebnis, kein Doppeleintrag
        }
      }
    }
    
    var timestamp = new Date().toLocaleString("de-DE", {timeZone: "Europe/Berlin"});
    
    // Zeile mit allen Daten (19 Spalten: A bis S)
    var rowData = [
      timestamp,                          // A: Datum
      params.name || '',                  // B: Name
      params.email || '',                 // C: E-Mail
      params.telefon || '',               // D: Telefon
      params.plz || '',                   // E: PLZ
      params.gebaeude || '',              // F: Gebäudetyp
      params.baujahr || '',               // G: Baujahr
      params.flaeche || '',               // H: Wohnfläche
      params.heizung || '',               // I: Aktuelle Heizung
      params.einkommen || '',             // J: Einkommen
      params.wp_empfehlung || '',         // K: WP-Empfehlung
      params.foerderung_euro || '',       // L: Förderung (€)
      params.foerderung_prozent || '',    // M: Förderung (%)
      params.eigenanteil || '',           // N: Eigenanteil (€)
      params.jahresersparnis || '',       // O: Jahresersparnis
      params.quelle || 'direkt',          // P: Quelle
      '',                                  // Q: Notizen
      'Neu',                               // R: Status
      params.gclid || ''                   // S: Google Click ID
    ];
    
    sheet.appendRow(rowData);
    
    // ──── GOOGLE ADS OFFLINE CONVERSIONS (SEPARATES SHEET) ────
    if (params.gclid && params.gclid.length > 5) {
      try {
        var convSS = SpreadsheetApp.openById('1uOa7S8hvDGhTzua2UVekvBfsHpWDQGxxPLpz-PjPKZU');
        var convSheet = convSS.getSheets()[0];
        
        // Header setzen falls Sheet leer
        if (convSheet.getLastRow() === 0) {
          convSheet.appendRow([
            'Google Click ID',
            'Conversion Name',
            'Conversion Time',
            'Conversion Value',
            'Conversion Currency'
          ]);
          convSheet.getRange(1, 1, 1, 5).setFontWeight('bold');
        }
        
        // Conversion Time im Google Ads Format
        var now = new Date();
        var convTime = Utilities.formatDate(now, "Europe/Berlin", "yyyy-MM-dd HH:mm:ss+0200");
        
        convSheet.appendRow([
          params.gclid,
          'Qualifizierter Lead',
          convTime,
          '1',
          'EUR'
        ]);
      } catch(convErr) {
        Logger.log("Conversion Sheet Fehler: " + convErr);
      }
    }
    
    // ──── BESTÄTIGUNGSMAIL AN DEN LEAD ────
    if (params.email && params.email.indexOf('@') > -1) {
      try {
        var foerderung = params.foerderung_euro || '---';
        var prozent = params.foerderung_prozent || '---';
        
        var betreff = "Ihre Förderberechnung: " + foerderung + "€ Zuschuss möglich";
        
        var body = "Hallo " + (params.name || '') + ",\n\n"
          + "vielen Dank für Ihre Anfrage über KlimaZuschuss.de!\n\n"
          + "Ihre persönliche Förderberechnung:\n\n"
          + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
          + "Geschätzter Zuschuss: " + foerderung + " €\n"
          + "Fördersatz: " + prozent + "%\n"
          + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
          + "So geht es jetzt weiter:\n\n"
          + "1. Ein Fachberater aus Ihrer Region wird sich in Kürze "
          + "telefonisch bei Ihnen melden.\n\n"
          + "2. Gemeinsam besprechen Sie Ihre Situation und vereinbaren "
          + "einen kostenlosen Termin bei Ihnen vor Ort.\n\n"
          + "3. Der Berater prüft vor Ort, welche Lösung für Ihr Gebäude "
          + "am besten geeignet ist und erstellt Ihnen ein individuelles "
          + "Angebot. Die komplette Abwicklung des Förderantrags "
          + "übernimmt der Fachbetrieb für Sie.\n\n"
          + "Der Termin ist kostenlos und völlig unverbindlich. "
          + "Sie gehen keinerlei Verpflichtung ein.\n\n"
          + "Wichtig: Die aktuelle Förderung von bis zu 70% ist zeitlich "
          + "begrenzt. Je früher Sie handeln, desto mehr sparen Sie.\n\n"
          + "Sie haben Fragen? Antworten Sie einfach auf diese Mail.\n\n"
          + "Beste Grüße\n"
          + "Ihr KlimaZuschuss-Team\n\n"
          + "---\n"
          + "KlimaZuschuss | klimazuschuss.de\n"
          + "E-Mail: team@klimazuschuss.de\n"
          + "* Unverbindliche Schätzung auf Basis der BEG-Richtlinien 2026.";
        
        // Senden mit Alias-Versuch
        var aliases = GmailApp.getAliases();
        var useAlias = false;
        for (var i = 0; i < aliases.length; i++) {
          if (aliases[i] === 'team@klimazuschuss.de') {
            useAlias = true;
            break;
          }
        }
        
        if (useAlias) {
          GmailApp.sendEmail(params.email, betreff, body, {
            name: "KlimaZuschuss",
            from: "team@klimazuschuss.de",
            replyTo: "team@klimazuschuss.de"
          });
        } else {
          GmailApp.sendEmail(params.email, betreff, body, {
            name: "KlimaZuschuss",
            replyTo: "team@klimazuschuss.de"
          });
          Logger.log("Alias team@klimazuschuss.de nicht gefunden. Verfügbare Aliases: " + aliases.join(", "));
        }
      } catch(mailErr) {
        Logger.log("Mail an Lead fehlgeschlagen: " + mailErr);
        // Fallback mit MailApp
        try {
          MailApp.sendEmail({
            to: params.email,
            subject: betreff,
            body: body,
            name: "KlimaZuschuss",
            replyTo: "team@klimazuschuss.de"
          });
        } catch(fallbackErr) {
          Logger.log("Auch Fallback fehlgeschlagen: " + fallbackErr);
        }
      }
    }
    
    // ──── BENACHRICHTIGUNG AN DICH ────
    try {
      var quelle = params.quelle || 'direkt';
      var notifySubject = "Neuer Lead (" + quelle + "): " + (params.name || 'Unbekannt') + " (" + (params.plz || '') + ")";
      
      var notifyBody = "NEUER LEAD über KlimaZuschuss.de\n"
        + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        + "Quelle: " + quelle.toUpperCase() + "\n\n"
        + "Name: " + (params.name || '-') + "\n"
        + "Telefon: " + (params.telefon || '-') + "\n"
        + "E-Mail: " + (params.email || '-') + "\n"
        + "PLZ: " + (params.plz || '-') + "\n\n"
        + "Gebäude: " + (params.gebaeude || '-') + "\n"
        + "Baujahr: " + (params.baujahr || '-') + "\n"
        + "Fläche: " + (params.flaeche || '-') + " m²\n"
        + "Heizung: " + (params.heizung || '-') + "\n"
        + "Einkommen: " + (params.einkommen || '-') + "\n\n"
        + "Empfehlung: " + (params.wp_empfehlung || '-') + "\n"
        + "Förderung: " + (params.foerderung_euro || '-') + "€ (" + (params.foerderung_prozent || '-') + "%)\n\n"
        + "Zeitpunkt: " + timestamp + "\n\n"
        + "→ BITTE INNERHALB 1 STUNDE KONTAKTIEREN";
      
      MailApp.sendEmail({
        to: "team@klimazuschuss.de",
        subject: notifySubject,
        body: notifyBody,
        name: "KlimaZuschuss System"
      });
      MailApp.sendEmail({
        to: "n.scheffler@360volt.de",
        subject: notifySubject,
        body: notifyBody,
        name: "KlimaZuschuss System"
      });
      
    } catch(notifyErr) {
      Logger.log("Benachrichtigung fehlgeschlagen: " + notifyErr);
    }
    
    return ContentService.createTextOutput("OK");
    
  } catch(err) {
    Logger.log("Fehler: " + err);
    return ContentService.createTextOutput("ERROR");
  }
}
