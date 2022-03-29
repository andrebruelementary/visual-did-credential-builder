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

import getDidDocument.PrismNodeDidDocumentAction;
import io.iohk.atala.prism.api.KeyGenerator;
import io.iohk.atala.prism.crypto.keys.ECKeyPair;
import io.iohk.atala.prism.identity.Did;
import io.iohk.atala.prism.identity.LongFormPrismDid;
import io.iohk.atala.prism.identity.PrismDid;
import io.iohk.atala.prism.identity.PrismDidDataModel;
import io.iohk.atala.prism.identity.PrismKeyType;

public class DID {

	protected HashMap<String, Contact> contacts;

	private String name;
	private String seedFilePath;
	private String metadataFilePath;
	private String vaultDbUrl;


	public static final int STATUS_UNPUBLISHED = 1;
	public static final int STATUS_PUBLISHED = 2;



	public DID(String n, String vaultUrl) {
		super();
		name = n;
		//metadataFilePath = metaPath;
		//seedFilePath = seedPath;
		vaultDbUrl = vaultUrl;
		//contacts = readContactsFromMetadataFile();
		contacts = readContactsFromVault();
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
		String protocol = "jdbc:derby:";

		Properties props = new Properties(); 
		props.put("user", name);
		props.put("password", "password");

		Connection conn;
		try {
			conn = DriverManager.getConnection(protocol + "./vaults/"+name, props);
			
			System.out.println("readContactsFromDatabase: query "+ name);
			String selectQuery = "SELECT * FROM contact";
			try {
				Statement fetchSeedStmt = conn.createStatement();
				
				ResultSet rs = fetchSeedStmt.executeQuery(selectQuery);
				
				while(rs.next()) {
					
					String name = rs.getString("name");
					Clob didString = rs.getClob("did_string");
					
					tmpContacts.put(name, new Contact(clobToString(didString),name));
					
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

		/*File file = new File("./did_vault/"+ seedFilePath);
		byte[] bytes = new byte[(int) file.length()];

		try(FileInputStream fis = new FileInputStream(file)){
			fis.read(bytes);
			return bytes;
		}*/
		byte[] seed = new byte[0];
		String protocol = "jdbc:derby:";

		Properties props = new Properties(); 
		props.put("user", name);
		props.put("password", "password");

		Connection conn;
		try {
			conn = DriverManager.getConnection(protocol + "./vaults/"+name, props);
			
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

	public String getSeedFilePath() {

		return seedFilePath;
	}

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

		// Instantiate the Factory
		DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
		try {
			// optional, but recommended
			// process XML securely, avoid attacks like XML External Entities (XXE)
			dbf.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);

			// parse XML file
			DocumentBuilder db = dbf.newDocumentBuilder();

			Document doc = db.parse(new File(metadataFilePath));
			doc.getDocumentElement().normalize();

			Node xml_did = doc.getElementsByTagName("did").item(0);
			Element elem_did = (Element) xml_did;

			return elem_did.getAttribute("latestOperationHash");

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

		return null;

	}

	public void setLatestOperationHash(String operationHash) {

		// Instantiate the Factory
		DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
		try {
			// optional, but recommended
			// process XML securely, avoid attacks like XML External Entities (XXE)
			dbf.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);

			// parse XML file
			DocumentBuilder db = dbf.newDocumentBuilder();

			Document doc = db.parse(new File(metadataFilePath));
			doc.getDocumentElement().normalize();

			Node xml_did = doc.getElementsByTagName("did").item(0);

			NamedNodeMap attr = xml_did.getAttributes();
			Node oprHashAttr = attr.getNamedItem("latestOperationHash");

			if(oprHashAttr != null) {
				System.out.println("latestOperationHash before change: "+oprHashAttr.getTextContent());
				oprHashAttr.setTextContent(operationHash);
				System.out.println("latestOperationHash after change: "+oprHashAttr.getTextContent());
			}
			else {
				Element elem_did = (Element) xml_did;
				elem_did.setAttribute("latestOperationHash", operationHash);
			}

			// write DOM document to a file
			try (FileOutputStream output =
					new FileOutputStream(metadataFilePath)) {
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
	
	private HashMap<String, Contact> readContactsFromMetadataFile() {

		HashMap<String,Contact> tmpContacts = new HashMap<String,Contact>();
		
		// Instantiate the Factory
		DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
		try {
			// optional, but recommended
			// process XML securely, avoid attacks like XML External Entities (XXE)
			dbf.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);

			// parse XML file
			DocumentBuilder db = dbf.newDocumentBuilder();

			Document doc = db.parse(new File(metadataFilePath));
			doc.getDocumentElement().normalize();

			NodeList xml_contacts = doc.getElementsByTagName("contact");
			for(int i = 0; i < xml_contacts.getLength(); i++) {
				
				Node contactNode = xml_contacts.item(i);
				Node nameAttribute = contactNode.getAttributes().getNamedItem("name");
				Node didStringAttribute = contactNode.getAttributes().getNamedItem("didstring");
				
				tmpContacts.put(nameAttribute.getNodeValue(), new Contact(didStringAttribute.getNodeValue(),nameAttribute.getNodeValue()));
			}
			
		}
		catch (SAXException saxe) {
			System.err.println("Error reading DID settings. "+ saxe.getMessage());
		}
		catch (ParserConfigurationException pce) {
			System.err.println("Error reading DIDs. "+ pce.getMessage());
		}
		catch (IOException e) {
			e.printStackTrace();
		}

		return tmpContacts;

	}
	
	private void addContactToMetadataFile(Contact c) {

		// Instantiate the Factory
		DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
		try {
			// optional, but recommended
			// process XML securely, avoid attacks like XML External Entities (XXE)
			dbf.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);

			// parse XML file
			DocumentBuilder db = dbf.newDocumentBuilder();

			Document doc = db.parse(new File(metadataFilePath));
			doc.getDocumentElement().normalize();

			Node xml_did = doc.getElementsByTagName("did").item(0);
			
			NodeList xml_contacts = doc.getElementsByTagName("contacts");
			Node contacts_node;
			if(xml_contacts.getLength() == 0) {
				// contacts node not presently in xml file...add it
				Element contactsElement = doc.createElement("contacts");
				contacts_node = xml_did.appendChild(contactsElement);
			}
			else {
				contacts_node = xml_contacts.item(0);
			}
			
			Element contactElement = doc.createElement("contact");
			contactElement.setAttribute("name", c.getName());
			contactElement.appendChild(doc.createTextNode(c.getDIDString()));
			
			contacts_node.appendChild(contactElement);
			
			// write DOM document to a file
			try (FileOutputStream output =
					new FileOutputStream(metadataFilePath)) {
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
	

	public String getLogFilePath() {
		return metadataFilePath +".log";
	}
	
	public boolean addContact(PrismDid did, String name) {
		if(contacts.containsKey(name)) {
			return false;
		}
		
		Contact c = new Contact(did, name);
		//addContactToMetadataFile(c);
		addContactToVault(c);
		
		contacts.put(name, c);
		return true;
		
	}
	
	private void addContactToVault(Contact c) {
		
		String protocol = "jdbc:derby:";

		Properties props = new Properties(); 
		props.put("user", name);
		props.put("password", "password");

		Connection conn;
		
		String query = "INSERT INTO contact(name,did_string) VALUES (?, ?)";
	    PreparedStatement pstmt;
		try {
			
			conn = DriverManager.getConnection(protocol + "./vaults/"+name, props);
		
			pstmt = conn.prepareStatement(query);
			pstmt.setString(1, c.getName());
		    Clob didString = conn.createClob();
		    didString.setString(1, c.getDIDString());
		    pstmt.setClob(2, didString);
		    pstmt.execute();
		    System.out.println("Added contact "+ c.getName() +" to vault");
		    didString.free();
		    pstmt.close();
		     
		    conn.close();
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}

	public boolean addContact(String didString, String name) {
		return addContact(PrismDid.fromString(didString), name);
	}
	
	public boolean hasContact(String name) {
		if(contacts != null) {
			return contacts.containsKey(name);
		}
		return false;
	}
	
	public Contact getContact(String name) {
		return contacts.get(name);
	}
	
	public HashMap<String,Contact> getContacts() {
		return contacts;
	}
	
	public void removeContact() {
		
	}

	public Batch[] getCredentialBatches() {
		
		List<Batch> tmpBatches = new Vector<Batch>();
		
		// Instantiate the Factory
		DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
		try {
			// optional, but recommended
			// process XML securely, avoid attacks like XML External Entities (XXE)
			dbf.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);

			// parse XML file
			DocumentBuilder db = dbf.newDocumentBuilder();
			DocumentBuilder batchDb = dbf.newDocumentBuilder();

			System.out.println("reading "+ metadataFilePath);
			
			Document doc = db.parse(new File(metadataFilePath));
			doc.getDocumentElement().normalize();
			
			Node xml_did = doc.getElementsByTagName("did").item(0);

			Node xml_history_folder_name = ((Element) xml_did).getElementsByTagName("history").item(0);
			
			System.out.println("folder with batches "+ xml_history_folder_name.getTextContent());
			
			// loop through vault and get name of all dids
			List<String> files;
			files = FileOperations.findFiles(Paths.get(new File("did_vault/"+xml_history_folder_name.getTextContent()).getAbsolutePath()), "xml");

			for(int i = 0; i < files.size(); i++) {
				System.out.println("reading file "+ files.get(i));
				Document batchXMLDoc = batchDb.parse(new File(files.get(i)));
				batchXMLDoc.getDocumentElement().normalize();
				
				Node xml_batch = batchXMLDoc.getElementsByTagName("batch").item(0);
				
				Node batchIDAttribute = xml_batch.getAttributes().getNamedItem("id");
				Node batchOpHashAttribute = xml_batch.getAttributes().getNamedItem("latestOperationHash");
				Batch batch = new Batch(batchIDAttribute.getNodeValue(), batchOpHashAttribute.getNodeValue());
				
				NodeList xml_credential_list = ((Element)xml_batch).getElementsByTagName("credential");
				for(int j = 0; j < xml_credential_list.getLength(); j++) {
					
					NamedNodeMap credentialAttributes = xml_credential_list.item(j).getAttributes();
					Credential credential = new Credential(credentialAttributes.getNamedItem("holdername").getNodeValue());
					
					if(credentialAttributes.getNamedItem("hash") != null) {
						credential.setHash(credentialAttributes.getNamedItem("hash").getNodeValue());
					}
					
					if(credentialAttributes.getNamedItem("txid") != null) {
						credential.setTxId(credentialAttributes.getNamedItem("txid").getNodeValue());
					}
					
					if(credentialAttributes.getNamedItem("network") != null) {
						credential.setNetwork(credentialAttributes.getNamedItem("network").getNodeValue());
					}
					
					credential.setPartOfBatch(batch);
					batch.addCredential(credential);
					
					
				}
				
				tmpBatches.add(batch);

			}
			
		}
		catch (SAXException saxe) {
			System.err.println("Error reading Batch settings. "+ saxe.getMessage());
		}
		catch (ParserConfigurationException pce) {
			System.err.println("Error reading Batches. "+ pce.getMessage());
		}
		catch (IOException e) {
			e.printStackTrace();
		}


		return tmpBatches.toArray(Batch[]::new);
		
	}

}
