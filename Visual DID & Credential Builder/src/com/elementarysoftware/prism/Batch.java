package com.elementarysoftware.prism;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.sql.Blob;
import java.sql.Clob;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Properties;
import java.util.Vector;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.TransformerException;

import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.xml.sax.SAXException;

import com.elementarysoftware.io.FileOperations;
import com.elementarysoftware.vdcb.Session;
import com.elementarysoftware.vdcb.Settings;

public class Batch {

	public static final boolean WITH_CREDENTIALS = true;
	public static final boolean WITHOUT_CREDENTIALS = false;
	
	private String id;
	private String latestOperationHash;
	private Credential[] credentials;
	//private String infoFilePath;
	private Settings settings;
	
	
	public Batch(String batchID, String latestOpHash, Settings s) {
		this(batchID, latestOpHash, WITHOUT_CREDENTIALS, s);
	}
	
	public Batch(String batchID, String latestOpHash, boolean withCredentials, Settings s) {
		id = batchID;
		latestOperationHash = latestOpHash;
		settings = s;
		if(withCredentials) {
			loadCredentials();
		}
	}
	
	/*public void addCredential(Credential c) {
		credentials.add(c);
	}*/

	/*public void reloadCredentials() {
		loadCredentials();
	}*/
	
	private void loadCredentials() {
		Vector<Credential> tmpCredentials = new Vector<Credential>();
		
		Properties props = (Properties) settings.get(Session.VAULT_PROPERTIES); 
		String vaultURL = (String) settings.get(Session.VAULT_JDBC_URL);
		
		Connection conn;
		try {
			conn = DriverManager.getConnection(vaultURL, props);
			
			System.out.println("loadCredentials");
			
			String selectQuery = "SELECT * FROM credential WHERE batch_id LIKE '"+ id +"'";
			try {
				Statement fetchCredentialsStmt = conn.createStatement();
				
				ResultSet rs = fetchCredentialsStmt.executeQuery(selectQuery);
				
				while(rs.next()) {
					/*
					 * column 1: hash
					 * column 2: holder_name
					 * column 3: batch_id
					 * column 4: network
					 * column 5: txid
					 * column 6: json
					 */
					
					Credential tmpCred = new Credential(rs.getString("holder_name"), settings);
						
					String hash = rs.getString("hash");
					if(hash != null) {
						tmpCred.setHash(hash);
					}
					
					tmpCred.setPartOfBatch(this);
					
					String network = rs.getString("network");
					if(network != null) {
						tmpCred.setNetwork(network);
					}
					
					String txid = rs.getString("txid");
					if(txid != null) {
						tmpCred.setTxId(txid);
					}
					
					
					Clob jsonClob = rs.getClob("json");
					JSONParser jsonParser = new JSONParser();
					try {
						JSONObject jsonObject = (JSONObject) jsonParser.parse(jsonClob.getCharacterStream());
						tmpCred.setJSON(jsonObject);
						System.out.println(jsonObject.toJSONString());
					} catch (IOException e) {
						e.printStackTrace();
					} catch (ParseException e) {
						e.printStackTrace();
					}
					
					tmpCredentials.add(tmpCred);
					
				}
				fetchCredentialsStmt.close();
				
				conn.close();
			} catch (SQLException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			} 
			
		} catch (SQLException e1) {
			e1.printStackTrace();
		}
		
		credentials = tmpCredentials.toArray(Credential[]::new);
	}
	
	public Credential[] getCredentials() {
		return getCredentials(false);
	}
	
	public Credential[] getCredentials(boolean refreshFromVault) {
		if(refreshFromVault) {
			loadCredentials();
		}
		return credentials;
	}

	public String getId() {
		return id;
	}

	public String getLatestOperationHash() {
		return latestOperationHash;
	}

	public void setLatestOperationHash(String operationHash) {
		Properties props = (Properties) settings.get(Session.VAULT_PROPERTIES); 
		String vaultURL = (String) settings.get(Session.VAULT_JDBC_URL);
		System.out.println("BATCH.setLatestOperationHash, vault jdbc url = "+ vaultURL);
		Connection conn;
		try {
			conn = DriverManager.getConnection(vaultURL, props);
			
			System.out.println("BATCH.setLatestOperationHash: query "+ id);
			String selectQuery = "SELECT * FROM batch WHERE id LIKE '"+ id +"'";
			try {
				Statement fetchStmt = conn.createStatement(ResultSet.TYPE_SCROLL_INSENSITIVE, ResultSet.CONCUR_UPDATABLE);
				
				ResultSet rs = fetchStmt.executeQuery(selectQuery);
				
				rs.next();
					
				rs.updateString("operation_hash", operationHash);
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
	
	/*
	public void setLatestOperationHash(String operationHash) {
		
		//TODO: Skrive denne slik at den lagrer i batch sin xml fil
		
		// Instantiate the Factory
				DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
				try {
					// optional, but recommended
					// process XML securely, avoid attacks like XML External Entities (XXE)
					dbf.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);

					// parse XML file
					DocumentBuilder db = dbf.newDocumentBuilder();

					Document doc = db.parse(new File(getBatchInfoFile()));
					doc.getDocumentElement().normalize();

					Node xml_batch = doc.getElementsByTagName("batch").item(0);

					NamedNodeMap attr = xml_batch.getAttributes();
					Node oprHashAttr = attr.getNamedItem("latestOperationHash");

					if(oprHashAttr != null) {
						System.out.println("latestOperationHash before change: "+oprHashAttr.getTextContent());
						oprHashAttr.setTextContent(operationHash);
						System.out.println("latestOperationHash after change: "+oprHashAttr.getTextContent());
					}
					else {
						Element elem_did = (Element) xml_batch;
						elem_did.setAttribute("latestOperationHash", operationHash);
					}

					// write DOM document to a file
					try (FileOutputStream output =
							new FileOutputStream(getBatchInfoFile())) {
						FileOperations.writeXml(doc, output);
					} catch (IOException e) {
						e.printStackTrace();
					} catch (TransformerException e) {
						// TODO Auto-generated catch block
						e.printStackTrace();
					}

				}
				catch (SAXException saxe) {
					System.err.println("Error reading DID settings. "+ saxe.getMessage());
				}
				catch (ParserConfigurationException pce) {
					System.err.println("Error reading DIDs. "+ pce.getMessage());
				}
				catch (IOException e) {
					// TODO Auto-generated catch block
					e.printStackTrace();
				}

	}
	*/

	/*
	private String getBatchInfoFile() {
		return infoFilePath;
	}*/
	
	/*
	private void createBatchInfoFile(File directory) {
		//infoFilePath = 
		DocumentBuilderFactory docFactory = DocumentBuilderFactory.newInstance();
		DocumentBuilder docBuilder;
		try {
			docBuilder = docFactory.newDocumentBuilder();
			
			Document doc = docBuilder.newDocument();
			Element rootElement = doc.createElement("batch");
			rootElement.setAttribute("id", id);
			doc.appendChild(rootElement);

			File batchMetadata = new File(directory, id+".xml");//File.createTempFile("did_", ".xml", directory);

			// write DOM document to a file
			try (FileOutputStream output =
					new FileOutputStream(batchMetadata.getAbsolutePath())) {
				FileOperations.writeXml(doc, output);
			} catch (IOException e) {
				e.printStackTrace();
			} catch (TransformerException e) {
				e.printStackTrace();
			}		
			
		} catch (ParserConfigurationException e1) {
			e1.printStackTrace();
		}
	
	}*/

	/*private boolean batchTableExistsInVault(Connection connection) throws SQLException {
	    DatabaseMetaData meta = connection.getMetaData();
	    ResultSet resultSet = meta.getTables(null, null, "batch", new String[] {"TABLE"});

	    return resultSet.next();
	}*/
	
	public boolean saveInVault() {
		
		boolean savedInVault = false;
		
		Properties props = (Properties) settings.get(Session.VAULT_PROPERTIES); 
		String vaultURL = (String) settings.get(Session.VAULT_JDBC_URL);
		
		Connection conn;
		try {
			conn = DriverManager.getConnection(vaultURL, props);
		
			/*
			if(!batchTableExistsInVault(conn)) {
				Statement createBatchTableStmt = conn.createStatement();
			
				createBatchTableStmt.execute("CREATE TABLE batch(id CHAR(64), operation_hash CHAR(64))");
				System.out.println("batch table created");
				createBatchTableStmt.close();
			}*/
			
			String query = "INSERT INTO batch(id,operation_hash) VALUES (?, ?)";
		    PreparedStatement pstmt;
		    pstmt = conn.prepareStatement(query);
			pstmt.setString(1, id);
			
			pstmt.setString(2, latestOperationHash);

		    if(pstmt.executeUpdate() > 0) {
	    		System.out.println("Batch "+ id +" added to vault");
	    		savedInVault = true;
		    }
		    /*else {
		    	// Insert failed, try creating the table and retry insert
		    	Statement createBatchTableStmt = conn.createStatement();
				createBatchTableStmt.execute("CREATE TABLE batch(id CHAR(64), operation_hash CHAR(64))");
				System.out.println("batch table created");
				createBatchTableStmt.close();
		    	
		    	if(pstmt.execute()) {
			    	System.out.println("Batch "+ id +" added to vault");
			    	savedInVault = true;
			    }
		    }*/
		    	
		    pstmt.close();
		    conn.close();
			
		} catch (SQLException e) {
			e.printStackTrace();
		}
		return savedInVault;
		
	}
	
}
