package com.elementarysoftware.prism;

import java.sql.Clob;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Properties;

import org.json.simple.JSONObject;

import com.elementarysoftware.vdcb.Session;
import com.elementarysoftware.vdcb.Settings;

public class Credential {

	private Batch parentBatch;
	private String holder, hash, txid, network;
	private JSONObject json;
	private Settings settings;
	
	/*public void setSettings(Settings s) {
		settings = s;
	}*/
	
	public Credential(String holdername, Settings s) {
		holder = holdername;
		settings = s;
	}

	public void setHash(String credentialhash) {
		hash = credentialhash;	
	}

	public void setTxId(String transactionid) {
		txid = transactionid;
	}

	public void setNetwork(String networkname) {
		network = networkname;
	}

	public String getHolder() {
		return holder;
	}

	public String getHash() {
		return hash;
	}

	public String getTxid() {
		return txid;
	}

	public String getNetwork() {
		return network;
	}

	public void setPartOfBatch(Batch batch) {
		parentBatch = batch;
	}
	
	public Batch getBatch() {
		return parentBatch;
	}

	/*private boolean credentialTableExistsInVault(Connection connection) throws SQLException {
	    DatabaseMetaData meta = connection.getMetaData();
	    ResultSet resultSet = meta.getTables(null, null, "credential", new String[] {"TABLE"});

	    return resultSet.next();
	}*/
	
	public boolean saveInVault() {
		String dbUrl = "";
		
		boolean savedInVault = false;
		
		Properties props = (Properties) settings.get(Session.VAULT_PROPERTIES); 
		String vaultURL = (String) settings.get(Session.VAULT_JDBC_URL);
		
		Connection conn;
		try {
			conn = DriverManager.getConnection(vaultURL, props);
			
		
			
			/*if(!credentialTableExistsInVault(conn)) {
				Statement createCredentialTableStmt = conn.createStatement();
			
				createCredentialTableStmt.execute("CREATE TABLE credential(hash CHAR(64), holder_name VARCHAR(60), batch_id CHAR(64), network VARCHAR(30), txid CHAR(64), json CLOB)");
				System.out.println("credential table created");
				createCredentialTableStmt.close();
			}*/
			
			/*private Batch parentBatch;
			private String holder, hash, txid, network;*/
			
			String query = "INSERT INTO credential(hash,holder_name,batch_id,network,txid,json) VALUES (?, ?, ?, ?, ?, ?)";
		    PreparedStatement pstmt;
		    pstmt = conn.prepareStatement(query);
			pstmt.setString(1, hash);
			pstmt.setString(2, holder);
			pstmt.setString(3, parentBatch.getId());
			pstmt.setString(4, (String) settings.get(Settings.NETWORK_ENVIRONMENT));
			pstmt.setString(5, txid);
			
			Clob jsonString = conn.createClob();
		    jsonString.setString(1, json.toJSONString());
		    pstmt.setClob(6, jsonString);
		    
		    if(pstmt.executeUpdate() > 0) {
		    	System.out.println("Credential "+ hash +" added to vault");
		    	savedInVault = true;
		    }
		    /*else {
		    	// Insert failed, try creating the table and retry insert
		    	Statement createCredentialTableStmt = conn.createStatement();
				createCredentialTableStmt.execute("CREATE TABLE credential(hash CHAR(64), holder_name VARCHAR(60), batch_id CHAR(64), network VARCHAR(30), blockchain_name VARCHAR(60), txid CHAR(64), json CLOB)");
				System.out.println("credential table created");
				createCredentialTableStmt.close();
				
				if(pstmt.execute()) {
				    System.out.println("Credential "+ hash +" added to vault");
				    savedInVault = true;
				}
		    }*/
		    
		    	
		    pstmt.close();
			
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return savedInVault;
		
	}

	public void setJSON(JSONObject credentialJson) {
		json = credentialJson;
	}
	
	public JSONObject getJSON() {
		return json;
	}
	
}
