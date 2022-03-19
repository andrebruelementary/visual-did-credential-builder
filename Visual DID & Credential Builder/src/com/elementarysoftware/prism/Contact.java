package com.elementarysoftware.prism;

import io.iohk.atala.prism.identity.PrismDid;

public class Contact {

	private PrismDid d;
	private String n;
	
	public Contact(PrismDid did, String name) {
		d = did;
		n = name;
	}
	
	public Contact(String didString, String name) {
		this(PrismDid.fromString(didString), name);
	}

	public String getName() {
		return n;
	}
	
	public String getDIDString() {
		return d.getValue();
	}
	
}
