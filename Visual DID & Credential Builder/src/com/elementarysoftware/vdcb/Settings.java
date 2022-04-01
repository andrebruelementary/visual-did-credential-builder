package com.elementarysoftware.vdcb;

import java.util.HashMap;

import com.elementarysoftware.prism.DID;

public class Settings extends HashMap<String,Object> {

	public static final String VAULT_ROOT_JDBC_URL = "Settings.VaultRootJDBCURL";
	public static final String ROOT_DIRECTORY = "Settings.RootDirectory";
	public static final String NETWORK_ENVIRONMENT = "Settings.NetworkEnvironment";
	//public static String Databasekoblingen
	
	// this object shall not be serialized, but added to remove warning message
	private static final long serialVersionUID = 3611086327031931353L;

	private Session session;
	
	public Settings() {
		
		super();
		put(VAULT_ROOT_JDBC_URL, "jdbc:derby:./vaults/");
		put(ROOT_DIRECTORY, System.getProperty("user.dir") + "/vaults");
		
		session = new Session();
		
	}
	
	
	
	@Override
	public Object get(Object key) {
		if(key.toString().startsWith("Session.")) {
			
			if(key.toString().equals(Session.VAULT_JDBC_URL)) {
				return get(VAULT_ROOT_JDBC_URL) +""+ session.get(Session.VAULT_JDBC_URL);
			}
			
			return session.get(key);
		}
		return super.get(key);
	}



	@Override
	public Object put(String key, Object value) {
		
		if(key.startsWith("Session.")) {
			if(key.equals(Session.CURRENT_DID)) {
				// setting new DID into the session. Clear session before insert
				session.clear();
			}
			return session.put(key, value);
		}
			
		return super.put(key, value);
	}



	/*public Object getSettingProperty(String propertyName) {
		return get(propertyName);
	}
	
	public Object getSessionProperty(String sessionPropertyName) {
		return session.get(sessionPropertyName);
	}

	public void putSessionProperty(String sessionPropertyName, Object sessionPropertyObject) {
		if(sessionPropertyName.equals(Session.CURRENT_DID)) {
			// setting new DID into the session. Clear session before insert
			session.clear();
		}
		session.put(sessionPropertyName, sessionPropertyObject);
	}*/
	
	
	
}
