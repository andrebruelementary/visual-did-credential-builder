package com.elementarysoftware.vdcb;

import java.util.HashMap;
import java.util.Properties;

import com.elementarysoftware.prism.DID;

public class Session extends HashMap<String,Object> {

	public static final String CURRENT_DID = "Session.CurrentDid";
	public static final String PASSPHRASE = "Session.Passphrase";
	public static final String VAULT_PROPERTIES = "Session.VaultProperties";
	public static final String VAULT_JDBC_URL = "Session.VaultJDBCUrl";
	
	// this object shall not be serialized, but added to remove warning message
	private static final long serialVersionUID = 3611086327031931353L;

	@Override
	public Object get(Object key) {
		if(key.toString().equals(VAULT_PROPERTIES)) {
			Properties props = new Properties(); 
			props.put("user", ((DID) get(CURRENT_DID)).getName() );
			props.put("password", get(PASSPHRASE));
			
			return props;
		}
		
		return super.get(key);
	}
	
	
	
/*
	public Properties getVaultProperties() {
		Properties props = new Properties(); 
		props.put("user", ((DID) get(CURRENT_DID)).getName() );
		props.put("password", get(PASSPHRASE));
		
		return props;
	}*/
	
}
