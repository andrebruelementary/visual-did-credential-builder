package com.elementarysoftware.prism;

import java.sql.Clob;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.Properties;

import com.elementarysoftware.vdcb.Session;
import com.elementarysoftware.vdcb.Settings;

import io.iohk.atala.prism.identity.PrismDid;

public class Contact {

	private PrismDid d;
	private String n;
	private Settings settings;
	
	public Contact(PrismDid did, String name, Settings s) {
		d = did;
		n = name;
		settings = s;
	}
	
	public Contact(String didString, String name, Settings s) {
		this(PrismDid.fromString(didString), name, s);
	}

	public String getName() {
		return n;
	}
	
	public String getDIDString() {
		return d.getValue();
	}
	
	public boolean addContactToVault() {
		
		boolean savedInVault = false;
		Properties props = (Properties) settings.get(Session.VAULT_PROPERTIES); 
		String vaultURL = (String) settings.get(Session.VAULT_JDBC_URL);
		
		Connection conn;
		try {
			conn = DriverManager.getConnection(vaultURL, props);
			
			PreparedStatement pstmt = conn.prepareStatement("INSERT INTO contact(name,did_string) VALUES (?, ?)");
			pstmt.setString(1, getName());
		    Clob didString = conn.createClob();
		    didString.setString(1, getDIDString());
		    pstmt.setClob(2, didString);
		    
		    if(pstmt.executeUpdate() > 0) {
		    	System.out.println("Added contact "+ getName() +" to vault");
	    		savedInVault = true;
		    }
		    
		    didString.free();
		    pstmt.close();
		     
		    conn.close();
		} catch (SQLException e) {
			e.printStackTrace();
		}
		return savedInVault;
	}
	
}
