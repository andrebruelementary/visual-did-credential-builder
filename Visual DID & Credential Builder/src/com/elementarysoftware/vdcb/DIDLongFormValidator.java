package com.elementarysoftware.vdcb;

import org.eclipse.jface.dialogs.IInputValidator;

public class DIDLongFormValidator implements IInputValidator {

	@Override
	public String isValid(String newText) {
		System.out.println("DID Long Form Validator checking "+ newText);
		// did:prism:62441b3634f80655b13b0b7b670e307f0429f8e7ece8f8cdf318b6530a5abb98:Cj8KPRI7CgdtYXN0ZXIwEAFKLgoJc2VjcDI1NmsxEiEDQdICjEcope89n_H_tOFqZ7HKLSUXaBxBolEqROuNZMs
		if(newText.length() < 74) {
			return "DID string too short";
		}
		/*else if(newText.lastIndexOf(":") != 74) {
		 	// comment back in if long form is a requirement
			return "DID string is not long form";
		}*/
		else if(!newText.contains("did:prism")) {
			return "DID not of type PRISM";
		}
		
		return null;
	}

}
