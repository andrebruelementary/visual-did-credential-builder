package com.elementarysoftware.prism;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.Reader;
import java.nio.file.Paths;
import java.sql.Blob;
import java.sql.Clob;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.HashMap;
import java.util.List;
import java.util.Properties;
import java.util.Vector;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.TransformerException;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

import com.elementarysoftware.io.FileOperations;
import com.elementarysoftware.vdcb.Session;
import com.elementarysoftware.vdcb.Settings;

import getDidDocument.PrismNodeDidDocumentAction;
import io.iohk.atala.prism.api.KeyGenerator;
import io.iohk.atala.prism.crypto.keys.ECKeyPair;
import io.iohk.atala.prism.identity.Did;
import io.iohk.atala.prism.identity.LongFormPrismDid;
import io.iohk.atala.prism.identity.PrismDid;
import io.iohk.atala.prism.identity.PrismDidDataModel;
import io.iohk.atala.prism.identity.PrismKeyType;

public class DID {

	private String name;
	private Settings settings;
	
	public static final int STATUS_UNPUBLISHED = 1;
	public static final int STATUS_PUBLISHED = 2;

	public DID(String n, Settings s) {
		name = n;
		settings = s;
	}
	
	private String clobToString(Clob data) {
	    StringBuilder sb = new StringBuilder();
	    try {
	        Reader reader = data.getCharacterStream();
	        BufferedReader br = new BufferedReader(reader);

	        String line;
	        while(null != (line = br.readLine())) {
	            sb.append(line);
	        }
	        br.close();
	    } catch (SQLException e) {
	        // handle this exception
	    } catch (IOException e) {
	        // handle this exception
	    }
	    return sb.toString();
	}
	
	
	private HashMap<String, Contact> readContactsFromVault() {
		HashMap<String,Contact> tmpContacts = new HashMap<String,Contact>();
		
		Properties props = (Properties) settings.get(Session.VAULT_PROPERTIES); 
		String vaultURL = (String) settings.get(Session.VAULT_JDBC_URL);
		
		Connection conn;
		try {
			conn = DriverManager.getConnection(vaultURL, props);
			
			System.out.println("readContactsFromDatabase: query "+ name);
			String selectQuery = "SELECT * FROM contact";
			try {
				Statement fetchSeedStmt = conn.createStatement();
				
				ResultSet rs = fetchSeedStmt.executeQuery(selectQuery);
				
				while(rs.next()) {
					
					String name = rs.getString("name");
					Clob didString = rs.getClob("did_string");
					
					tmpContacts.put(name, new Contact(clobToString(didString),name, settings));
					
					//release the clob and free up memory. (since JDBC 4.0)
					didString.free();
				}
				
				fetchSeedStmt.close();
				
				conn.close();
			} catch (SQLException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			} 
			
		} catch (SQLException e1) {
			e1.printStackTrace();
		}
		
		return tmpContacts;
	}

	public String getName() {
		return name;
	}

	public byte[] getSeed() {

		byte[] seed = new byte[0];
		Properties props = (Properties) settings.get(Session.VAULT_PROPERTIES); 
		String vaultURL = (String) settings.get(Session.VAULT_JDBC_URL);
		System.out.println("getSeed, vault jdbc url = "+ vaultURL);
		Connection conn;
		try {
			conn = DriverManager.getConnection(vaultURL, props);
			
			System.out.println("getSeed: query "+ name);
			String selectQuery = "SELECT * FROM did WHERE name LIKE '"+name+"'";
			try {
				Statement fetchSeedStmt = conn.createStatement();
				
				ResultSet rs = fetchSeedStmt.executeQuery(selectQuery);
				
				rs.next();
				System.out.println("name = "+ rs.getString("name"));
					
				Blob blob = rs.getBlob("seed");

				int blobLength = (int) blob.length();
				System.out.println("length of seed "+ blobLength);
				seed = blob.getBytes(1, blobLength);
		
				//release the blob and free up memory. (since JDBC 4.0)
				blob.free();
				
				fetchSeedStmt.close();
				
				conn.close();
			} catch (SQLException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			} 
			
		} catch (SQLException e1) {
			e1.printStackTrace();
		}
		
		return seed;
		
	}

	/*
	public String getSeedFilePath() {

		return seedFilePath;
	}*/

	public int getStatus() {


		//			val seed = File(seedFile).readBytes()
		//		    println("read seed from file $seedFile")
		byte[] seed = getSeed();

		//		    val masterKeyPair = KeyGenerator.deriveKeyFromFullPath(seed, 0, PrismKeyType.MASTER_KEY, 0)
		KeyGenerator keygen = KeyGenerator.INSTANCE;
		ECKeyPair masterKeyPair = keygen.deriveKeyFromFullPath(seed, 0, PrismKeyType.INSTANCE.getMASTER_KEY(), 0);

		//		    val unpublishedDid = PrismDid.buildLongFormFromMasterPublicKey(masterKeyPair.publicKey)
		LongFormPrismDid unpublishedDid = PrismDid.buildLongFormFromMasterPublicKey(masterKeyPair.getPublicKey());

		//		    val didCanonical = unpublishedDid.asCanonical().did
		//		    val didLongForm = unpublishedDid.did
		Did didCanonical = unpublishedDid.asCanonical().getDid();
		Did didLongForm = unpublishedDid.getDid();

		//PrismDid prismDid = PrismDid.fromDid(didCanonical);
		//
		//		    println("canonical: $didCanonical")
		//		    println("long form: $didLongForm")

		System.out.println("canonical: "+ didCanonical);
		System.out.println("long form: "+ didLongForm);

		PrismDidDataModel model_canonical_form = PrismNodeDidDocumentAction.Companion.getDidDocument(didCanonical.toString());
		if(model_canonical_form != null) {
			System.out.println(model_canonical_form.getPublicKeys().length);
			System.out.println(model_canonical_form.getDidDataModel().toString());
			return STATUS_PUBLISHED;
		}
		else {
			//System.out.println("No model returned from Canonical DID...");
			PrismDidDataModel model_long_form = PrismNodeDidDocumentAction.Companion.getDidDocument(didLongForm.toString());
			if(model_long_form != null) {
				System.out.println(model_long_form.getPublicKeys().length);
				System.out.println(model_long_form.getDidDataModel().toString());
			}
			else {
				System.out.println("No model returned from long form DID...");
			}
		}




		return STATUS_UNPUBLISHED;
	}

	public PrismDidDataModel getDataModel() {

		byte[] seed = getSeed();

		KeyGenerator keygen = KeyGenerator.INSTANCE;
		ECKeyPair masterKeyPair = keygen.deriveKeyFromFullPath(seed, 0, PrismKeyType.INSTANCE.getMASTER_KEY(), 0);

		LongFormPrismDid unpublishedDid = PrismDid.buildLongFormFromMasterPublicKey(masterKeyPair.getPublicKey());

		Did didCanonical = unpublishedDid.asCanonical().getDid();
		Did didLongForm = unpublishedDid.getDid();

		PrismDidDataModel model = PrismNodeDidDocumentAction.Companion.getDidDocument(didCanonical.toString());
		if(model != null) {
			return model;
		}
		else {
			model = PrismNodeDidDocumentAction.Companion.getDidDocument(didLongForm.toString());
			if(model != null) {
				return model;
			}
		}

		return null;
	}
	
	public String getLatestOperationHash() {
	
		String latestOpHash = "";
		Properties props = (Properties) settings.get(Session.VAULT_PROPERTIES); 
		String vaultURL = (String) settings.get(Session.VAULT_JDBC_URL);
		System.out.println("DID.getLatestOperationHash, vault jdbc url = "+ vaultURL);
		Connection conn;
		try {
			conn = DriverManager.getConnection(vaultURL, props);
			
			System.out.println("DID.getLatestOperationHash: query "+ name);
			String selectQuery = "SELECT latest_operation_hash FROM did WHERE name LIKE '"+name+"'";
			try {
				Statement fetchStmt = conn.createStatement();
				
				ResultSet rs = fetchStmt.executeQuery(selectQuery);
				
				if(!rs.next()) return "";
					
				latestOpHash = rs.getString(1);
				fetchStmt.close();
				
				conn.close();
			} catch (SQLException e) {
				e.printStackTrace();
			} 
			
		} catch (SQLException e1) {
			e1.printStackTrace();
		}
		
		return latestOpHash;
		
	}

	
	public void setLatestOperationHash(String operationHash) {
		
		Properties props = (Properties) settings.get(Session.VAULT_PROPERTIES); 
		String vaultURL = (String) settings.get(Session.VAULT_JDBC_URL);
		System.out.println("DID.setLatestOperationHash, vault jdbc url = "+ vaultURL);
		Connection conn;
		try {
			conn = DriverManager.getConnection(vaultURL, props);
			
			System.out.println("DID.setLatestOperationHash: query "+ name);
			String selectQuery = "SELECT * FROM did WHERE name LIKE '"+name+"'";
			try {
				Statement fetchStmt = conn.createStatement(ResultSet.TYPE_SCROLL_INSENSITIVE, ResultSet.CONCUR_UPDATABLE);
				
				ResultSet rs = fetchStmt.executeQuery(selectQuery);
				
				rs.next();
					
				rs.updateString("latest_operation_hash", operationHash);
				rs.updateRow();
				
				fetchStmt.close();
				
				conn.close();
			} catch (SQLException e) {
				e.printStackTrace();
			} 
			
		} catch (SQLException e1) {
			e1.printStackTrace();
		}
		
	}
	
	public String getLogFilePath() {
		return "null.log";
	}
	
	public boolean addContact(PrismDid did, String name) {
		
		HashMap<String,Contact> contacts = readContactsFromVault();
		if(contacts.containsKey(name)) {
			return false;
		}
		
		Contact c = new Contact(did, name, settings);
		
		c.addContactToVault();
		
		contacts.put(name, c);
		return true;
		
	}
	
	public boolean addContact(String didString, String name) {
		return addContact(PrismDid.fromString(didString), name);
	}
	
	public boolean hasContact(String name) {
		HashMap<String,Contact> contacts = readContactsFromVault();
		if(contacts != null) {
			return contacts.containsKey(name);
		}
		return false;
	}
	
	public Contact getContact(String name) {
		HashMap<String,Contact> contacts = readContactsFromVault();
		return contacts.get(name);
	}
	
	public HashMap<String,Contact> getContacts() {
		HashMap<String,Contact> contacts = readContactsFromVault();
		return contacts;
	}
	
	public void removeContact() {
		//TODO: write code to remove from database vault
	}
	
	public Batch[] getCredentialBatches() {
		
		List<Batch> tmpBatches = new Vector<Batch>();
		Properties props = (Properties) settings.get(Session.VAULT_PROPERTIES); 
		String vaultURL = (String) settings.get(Session.VAULT_JDBC_URL);
		
		Connection conn;
		try {
			conn = DriverManager.getConnection(vaultURL, props);
			
			System.out.println("getCredentialBatches");
			
			String selectQuery = "SELECT * FROM batch";
			try {
				Statement fetchBatchStmt = conn.createStatement();
				
				ResultSet rs = fetchBatchStmt.executeQuery(selectQuery);
				
				while(rs.next()) {
					/*
					 * column 1: batch id
					 * column 2: latest batch operation hash
					 */
					tmpBatches.add(new Batch(rs.getString(1), rs.getString(2), Batch.WITH_CREDENTIALS, settings));
				}
				fetchBatchStmt.close();
				
				conn.close();
			} catch (SQLException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			} 
			
		} catch (SQLException e1) {
			e1.printStackTrace();
		}
		
		return tmpBatches.toArray(Batch[]::new);
		
	}

	public void updateSettings(Settings s) {
		settings = s;
	}

}
